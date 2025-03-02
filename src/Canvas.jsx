import React, { useEffect } from "react";
import { Stage, Layer, Rect } from "react-konva";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotes, addNote, updateNote, moveNote } from "./store";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
console.log('SOCKET_URL: Canvas.jsx=================', SOCKET_URL);
const socket = io(SOCKET_URL);

const Canvas = () => {
  const dispatch = useDispatch();
  const notes = useSelector((state) => state.notes);

  useEffect(() => {
    dispatch(fetchNotes()); // Load notes on mount

    // Listen for real-time updates
    socket.on("noteAdded", (note) => {
      console.log("New note received:", note);
      dispatch(addNote(note)); // Add note to Redux store directly
    });

    socket.on("noteUpdated", (note) => {
      console.log("Note updated:", note);
      dispatch(updateNote(note)); // Update note in Redux store directly
    });

    return () => {
      socket.off("noteAdded");
      socket.off("noteUpdated");
    };
  }, [dispatch]);

  // Handle dragging
  const handleDragEnd = (e, id) => {
    const { x, y } = e.target.position();
    dispatch(moveNote(id, x, y)); // Update note position in DB
  };

  return (
    <div>
      <h1>Interactive Canvas</h1>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {notes.map((note) => (
            <Rect
              key={note._id}
              x={note.x}
              y={note.y}
              width={100}
              height={50}
              fill="lightblue"
              draggable
              onDragEnd={(e) => handleDragEnd(e, note._id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
