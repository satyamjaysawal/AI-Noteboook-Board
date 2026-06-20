const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Note = require('../models/Note');
const Connection = require('../models/Connection');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateUUID = (req, res, next) => {
  if (!UUID_REGEX.test(req.params.id)) {
    return res.status(400).json({ message: 'Invalid note ID' });
  }
  next();
};

router.get('/notes', async (req, res) => {
  try {
    const { tag, pinned, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const where = {};

    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }
    if (pinned) {
      where.isPinned = pinned === 'true';
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const sortField = sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    const notes = await Note.findAll({
      where,
      order: [[sortField, sortOrder]]
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/notes/:id', validateUUID, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const note = await Note.create({
      title: req.body.title,
      content: req.body.content,
      position: req.body.position || { x: 100, y: 100 },
      styling: {
        backgroundColor: req.body.styling?.backgroundColor || '#ffffff',
        fontSize: req.body.styling?.fontSize || 16
      },
      imageUrl: req.body.imageUrl || '',
      tags: req.body.tags || [],
      isPinned: req.body.isPinned || false
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('note-added', note);
    }

    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/notes/:id', validateUUID, async (req, res) => {
  try {
    if (!req.body.content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    await note.update({
      title: req.body.title || 'Untitled',
      content: req.body.content,
      position: req.body.position || { x: 100, y: 100 },
      styling: {
        backgroundColor: req.body.styling?.backgroundColor || '#ffffff',
        fontSize: req.body.styling?.fontSize || 16
      },
      imageUrl: req.body.imageUrl || '',
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      isPinned: req.body.isPinned ?? false
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('note-updated', note);
    }

    res.json(note);
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/notes/:id', validateUUID, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    await Connection.destroy({
      where: {
        [Op.or]: [{ source: req.params.id }, { target: req.params.id }]
      }
    });

    await note.destroy();

    const io = req.app.get('io');
    if (io) {
      io.emit('note-deleted', req.params.id);
      io.emit('connection-deleted', { noteId: req.params.id });
    }

    res.json({ message: 'Note and associated connections deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/notes/:id/pin', validateUUID, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    await note.update({ isPinned: !note.isPinned });

    const io = req.app.get('io');
    if (io) {
      io.emit('note-updated', note);
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;