const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const Board = require('../models/Board');
const Task = require('../models/Task');
const verifyToken = require('../middleware/verify');

router.use(verifyToken);

// @route   POST /api/teams
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ message: 'Team name is required' });

        const team = await Team.create({
            name,
            description,
            createdBy: req.user._id,
            members: [{ user: req.user._id, role: 'admin' }]
        });

        await team.populate('members.user', 'name email');
        res.status(201).json({ message: 'Team created', team });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/teams
router.get('/', async (req, res) => {
    try {
        const teams = await Team.find({ 'members.user': req.user._id })
            .populate('members.user', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ teams });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/teams/:id
router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('members.user', 'name email')
            .populate('createdBy', 'name email');

        if (!team) return res.status(404).json({ message: 'Team not found' });

        const isMember = team.members.some(
            m => m.user._id.toString() === req.user._id.toString()
        );
        if (!isMember) return res.status(403).json({ message: 'Not a team member' });

        res.json({ team });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   POST /api/teams/:id/invite
router.post('/:id/invite', async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const requester = team.members.find(
            m => m.user.toString() === req.user._id.toString()
        );
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can invite members' });
        }

        const userToInvite = await User.findOne({ email });
        if (!userToInvite) {
            return res.status(404).json({ message: 'No user found with that email' });
        }

        const alreadyMember = team.members.some(
            m => m.user.toString() === userToInvite._id.toString()
        );
        if (alreadyMember) {
            return res.status(400).json({ message: 'User is already a team member' });
        }

        team.members.push({ user: userToInvite._id, role: role || 'member' });
        await team.save();
        await team.populate('members.user', 'name email');

        res.json({ message: `${userToInvite.name} added to team`, team });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   DELETE /api/teams/:id/members/:userId
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const requester = team.members.find(
            m => m.user.toString() === req.user._id.toString()
        );
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }

        team.members = team.members.filter(
            m => m.user.toString() !== req.params.userId
        );
        await team.save();

        res.json({ message: 'Member removed', team });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   DELETE /api/teams/:id
router.delete('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const requester = team.members.find(
            m => m.user.toString() === req.user._id.toString()
        );
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can delete teams' });
        }

        const boards = await Board.find({ team: req.params.id }).select('_id');
        const boardIds = boards.map(board => board._id);

        await Task.deleteMany({ board: { $in: boardIds } });
        await Board.deleteMany({ team: req.params.id });
        await team.deleteOne();

        res.json({ message: 'Team deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;