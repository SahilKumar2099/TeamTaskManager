const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Board = require('../models/Board');
const Team = require('../models/Team');
const verifyToken = require('../middleware/verify');

router.use(verifyToken);

const getBoardAndMembership = async (boardId, userId) => {
    const board = await Board.findById(boardId);
    if (!board) return { board: null, membership: null };
    const team = await Team.findById(board.team);
    if (!team) return { board, membership: null };
    const membership = team.members.find(
        m => m.user.toString() === userId.toString()
    );
    return { board, team, membership: membership || null };
};

// @route   POST /api/tasks
router.post('/', async (req, res) => {
    try {
        const { title, description, boardId, assignedTo, priority, dueDate, labels } = req.body;
        if (!title || !boardId) {
            return res.status(400).json({ message: 'Title and boardId are required' });
        }

        const { board, membership } = await getBoardAndMembership(boardId, req.user._id);
        if (!board) return res.status(404).json({ message: 'Board not found' });
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        const task = await Task.create({
            title,
            description,
            board: boardId,
            assignedTo: assignedTo || null,
            priority: priority || 'medium',
            dueDate: dueDate || null,
            labels: labels || [],
            createdBy: req.user._id
        });

        await task.populate('assignedTo', 'name email');
        await task.populate('createdBy', 'name email');

        res.status(201).json({ message: 'Task created', task });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/tasks/my
router.get('/my', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user._id })
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .populate('board', 'name')
            .sort({ dueDate: 1 });

        res.json({ tasks });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/tasks/board/:boardId
router.get('/board/:boardId', async (req, res) => {
    try {
        const { board, membership } = await getBoardAndMembership(
            req.params.boardId, req.user._id
        );
        if (!board) return res.status(404).json({ message: 'Board not found' });
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        const { status, priority, assignedTo } = req.query;
        const filter = { board: req.params.boardId };
        if (status)     filter.status = status;
        if (priority)   filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ tasks });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/tasks/:id
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .populate('board', 'name');

        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { membership } = await getBoardAndMembership(task.board._id, req.user._id);
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        res.json({ task });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { membership } = await getBoardAndMembership(task.board, req.user._id);
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        const { title, description, status, priority, dueDate, assignedTo, labels } = req.body;

        if (title)                     task.title       = title;
        if (description !== undefined) task.description = description;
        if (status)                    task.status      = status;
        if (priority)                  task.priority    = priority;
        if (dueDate !== undefined)     task.dueDate     = dueDate;
        if (assignedTo !== undefined)  task.assignedTo  = assignedTo;
        if (labels)                    task.labels      = labels;

        await task.save();
        await task.populate('assignedTo', 'name email');
        await task.populate('createdBy', 'name email');

        res.json({ message: 'Task updated', task });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { membership } = await getBoardAndMembership(task.board, req.user._id);
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        const isCreator = task.createdBy.toString() === req.user._id.toString();
        if (!isCreator && membership.role !== 'admin') {
            return res.status(403).json({ message: 'Only task creator or admin can delete' });
        }

        await task.deleteOne();
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;