
AI-NoteBook-Board Application UI Link : [https://ai-noteboook-board.onrender.com](https://ai-noteboook-board.onrender.com)


AI-NoteBook-Board-Backend-Deployed Link: [https://ai-noteboook-board-backend.vercel.app](https://ai-noteboook-board-backend.vercel.app/)
****
AI-NoteBook-Board-Frontend-GitHub: [https://github.com/satyamjaysawal/AI-Noteboook-Board.git](https://github.com/satyamjaysawal/AI-Noteboook-Board.git)


AI-NoteBook-Board-Backend-GitHub: [https://github.com/satyamjaysawal/AI-Noteboook-Board-Backend.git](https://github.com/satyamjaysawal/AI-Noteboook-Board-Backend.git)
****


# NoteFlow - Collaborative Note-Taking Application

**NoteFlow** is an interactive, real-time note-taking and mind-mapping application built with React, ReactFlow, Socket.IO, and a Node.js backend powered by MongoDB and Google Generative AI. Users can create, edit, connect, and style notes on a dynamic canvas, with features like real-time collaboration, AI-powered text processing, and customizable UI elements.

## Features
- **Interactive Canvas**: Drag and drop notes, connect them with customizable arrows, and zoom in/out.
- **Real-Time Collaboration**: Powered by Socket.IO for instant updates across clients.
- **AI Assistance**: Leverage Google Generative AI for grammar correction, summarization, text generation, and more.
- **Customization**: Adjust note colors, font sizes, background styles, and arrow types.
- **Image Support**: Upload images to notes for richer content.
- **Dark/Light Mode**: Toggle between themes for a personalized experience.
- **Persistent Storage**: Notes and connections are saved in MongoDB.

## Project Structure
```
NoteFlow/
├── frontend/              # React frontend codebase
└── backend/               # Node.js backend codebase
```

---

## Frontend

### Tech Stack
- **React**: Frontend framework
- **ReactFlow**: Library for building node-based UIs
- **Socket.IO-Client**: Real-time communication
- **Zustand**: State management
- **Redux**: Alternative state management (optional)
- **Lucide-React**: Icons
- **Tailwind CSS**: Styling

### Setup Instructions
1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/noteflow.git
   cd noteflow/frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the `frontend` directory with the following:
   ```
   VITE_API_URL=https://your-backend-url/api
   VITE_SOCKET_URL=https://your-backend-url
   ```
   Replace `https://your-backend-url` with your deployed backend URL or `http://localhost:5000` for local development.

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or the port specified by Vite).

### Scripts
- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run preview`: Preview the production build

### Key Components
- **`NoteFlow.jsx`**: Main canvas component using ReactFlow for note visualization and interaction.
- **`NoteNode.jsx`**: Custom note component with editing, AI processing, and styling features.
- **`store/noteStore.js`**: Zustand store for managing notes and connections.
- **`services/socket.js`**: Socket.IO client setup for real-time updates.

---

## Backend

### Tech Stack
- **Node.js & Express**: Server framework
- **MongoDB & Mongoose**: Database and ORM
- **Socket.IO**: Real-time communication
- **Google Generative AI**: AI-powered text processing
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent abuse with `express-rate-limit`

### Setup Instructions
1. **Navigate to Backend Directory**
   ```bash
   cd noteflow/backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the `backend` directory with the following:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/noteflow
   GOOGLE_API_KEY=your-google-api-key
   CLIENT_URL=http://localhost:5173
   ```
   - `PORT`: Port for the server (default: 5000)
   - `MONGODB_URI`: Your MongoDB connection string (local or Atlas)
   - `GOOGLE_API_KEY`: API key for Google Generative AI (get from Google Cloud Console)
   - `CLIENT_URL`: Frontend URL for CORS and Socket.IO

4. **Start MongoDB**
   Ensure MongoDB is running locally (`mongod`) or use a cloud service like MongoDB Atlas.

5. **Run the Server**
   ```bash
   npm start
   ```
   The server will run at `http://localhost:5000`.

### Scripts
- `npm start`: Start the server with Node.js
- `npm run dev`: Start with `nodemon` for auto-reloading (requires `nodemon` installation)

### API Endpoints
- **Notes**
  - `GET /api/notes`: Fetch all notes
  - `POST /api/notes`: Create a new note
  - `PUT /api/notes/:id`: Update a note
  - `DELETE /api/notes/:id`: Delete a note
  - `PATCH /api/notes/:id/pin`: Toggle pin status
- **Connections**
  - `GET /api/connections`: Fetch all connections
  - `POST /api/connections`: Create a new connection
  - `DELETE /api/connections/:id`: Delete a connection

### Socket.IO Events
- `connection`: Client connects to the server
- `ai-process`: Request AI text processing
- `ai-response`: Response from AI processing
- `note-added`, `note-updated`, `note-deleted`: Real-time note updates
- `connection-added`, `connection-deleted`: Real-time connection updates

---

## Deployment

### Frontend
- Build the frontend with `npm run build` and deploy the `dist` folder to a static hosting service (e.g., Vercel, Netlify).
- Update `.env` with the production backend URL.

### Backend
- Deploy to a platform like Vercel, Render, or Heroku.
- Ensure environment variables are set in the hosting platform’s dashboard.
- Use a managed MongoDB service (e.g., MongoDB Atlas) for persistence.

---

## Usage
1. Open the app in your browser.
2. Click "Add Note" to create a new note.
3. Drag notes to reposition, connect them by dragging from handles, and edit content by clicking.
4. Use the toolbar to toggle dark mode, adjust backgrounds, arrow styles, and zoom.
5. Leverage AI features in the note editor for text enhancement.

---

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.



---

## Troubleshooting
- **CORS Issues**: Ensure `CLIENT_URL` matches the frontend origin.
- **Socket.IO Errors**: Verify the backend URL in `VITE_SOCKET_URL`.
- **MongoDB Connection**: Check `MONGODB_URI` and ensure the database is running.
- **AI Failures**: Confirm `GOOGLE_API_KEY` is valid and has access to the Generative AI API.

---



****
****








