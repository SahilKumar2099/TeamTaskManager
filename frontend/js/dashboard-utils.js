(function (root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    root.TaskManagerDashboardUtils = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    function safeParseJson(value) {
        if (value === null || value === undefined) return null;
        if (typeof value !== 'string') return value;

        try {
            return JSON.parse(value);
        } catch (err) {
            return null;
        }
    }

    function getStoredUser(storage) {
        if (!storage || typeof storage.getItem !== 'function') return null;

        const parsed = safeParseJson(storage.getItem('user'));
        return parsed && typeof parsed === 'object' ? parsed : null;
    }

    function getStoredToken(storage) {
        if (!storage || typeof storage.getItem !== 'function') return null;
        return storage.getItem('token');
    }

    return {
        getStoredUser,
        getStoredToken
    };
});
