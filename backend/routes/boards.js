const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Board = require('../models/Board');
const verifyToken = require('../middleware/verify');

router.use(verifyToken);

const ensureTeamMembership = async (teamId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) return { team: null, membership: null };
    const membership = team.members.find(
        m => m.user.toString() === userId.toString()
    );
    return { team, membership: membership || null };
};

// @route   POST /api/boards
router.post('/', async (req, res) => {
    try {
        const { name, description, teamId } = req.body;
        if (!name || !teamId) {
            return res.status(400).json({ message: 'Board name and teamId are required' });
        }

        const { team, membership } = await ensureTeamMembership(teamId, req.user._id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        const board = await Board.create({
            name,
            description,
            team: teamId,
            createdBy: req.user._id
        });

        res.status(201).json({ message: 'Board created', board });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/boards/team/:teamId
router.get('/team/:teamId', async (req, res) => {
    try {
        const { membership } = await ensureTeamMembership(req.params.teamId, req.user._id);
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        const boards = await Board.find({ team: req.params.teamId }).sort({ createdAt: -1 });
        res.json({ boards });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   GET /api/boards/:id
router.get('/:id', async (req, res) => {
    try {
        const board = await Board.findById(req.params.id).populate('team', 'name');
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const { membership } = await ensureTeamMembership(board.team._id, req.user._id);
        if (!membership) return res.status(403).json({ message: 'Not a team member' });

        res.json({ board });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
