const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Enable sessions
app.use(session({
    secret: '27-7e6b20f3f7f3y',
    resave: false,
    saveUninitialized: true
}));

// Store active users in an object
const activeUsers = {};

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

// Login route
app.get('/login', (req, res) => {
    // If the user is already logged in, redirect them to the home page
    if (req.session.user) {
        return res.redirect('/');
    }
    // Perform login authentication
    req.session.user = { username: 'kali' }; // Dummy user for demonstration
    res.redirect('/');
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/login');
    });
});

// Serve static files from the client directory
app.use(express.static(__dirname + '/../client'));

// Handle socket.io connections
io.on('connection', socket => {
    console.log('New connection:', socket.id);

    // Add user to activeUsers object when connected
    if (socket.handshake.session && socket.handshake.session.user) {
        const username = socket.handshake.session.user.username;
        activeUsers[socket.id] = username;
        // Emit updated user list to all clients
        io.emit('user-list', Object.values(activeUsers));
    }

    // Event listener for disconnect
    socket.on('disconnect', () => {
        // Remove user from activeUsers object
        delete activeUsers[socket.id];
        // Emit updated user list to all clients
        io.emit('user-list', Object.values(activeUsers));
    });

    // Event listener for receiving text updates from clients
    socket.on('text-update', text => {
        // Broadcast the text update to all connected clients except the sender
        socket.broadcast.emit('text-update', text);
    });

    // Event listener for receiving cursor updates from clients
    socket.on('cursor-update', position => {
        // Broadcast the cursor update to all connected clients except the sender
        socket.broadcast.emit('cursor-update', position);
    });

    // Event listener for receiving selection updates from clients
    socket.on('selection-update', selection => {
        // Broadcast the selection update to all connected clients except the sender
        socket.broadcast.emit('selection-update', selection);
    });

    // Handle text updates from clients
    socket.on('text-update', delta => {
        // Apply conflict resolution logic
        const resolvedDelta = resolveConflicts(delta);
        // Broadcast the resolved delta to all connected clients except the sender
        socket.broadcast.emit('text-update', resolvedDelta);
    });
});

// Placeholder for conflict resolution logic
function resolveConflicts(delta) {
    // Implement your conflict resolution logic here
    // For now, returning the delta as is
    return delta;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
