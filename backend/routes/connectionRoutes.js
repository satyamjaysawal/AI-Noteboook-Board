const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Note = require('../models/Note');

router.get('/connections', async (req, res) => {
  try {
    const connections = await Connection.findAll();
    res.json(connections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/connections', async (req, res) => {
  try {
    const sourceExists = await Note.findByPk(req.body.source);
    const targetExists = await Note.findByPk(req.body.target);

    if (!sourceExists || !targetExists) {
      return res.status(400).json({ message: 'Source or target note does not exist' });
    }

    const connection = await Connection.create({
      source: req.body.source,
      target: req.body.target,
      sourceHandle: req.body.sourceHandle,
      targetHandle: req.body.targetHandle,
      label: req.body.label || ''
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('connection-added', connection);
    }

    res.status(201).json(connection);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/connections/:id', async (req, res) => {
  try {
    const connection = await Connection.findByPk(req.params.id);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    await connection.destroy();

    const io = req.app.get('io');
    if (io) {
      io.emit('connection-deleted', req.params.id);
    }

    res.json({ message: 'Connection deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;