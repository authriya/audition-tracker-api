module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_ORIGIN: 'https://audition-tracker.authriya.now.sh/',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://supriyaganesh@localhost/audition-tracker',
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://supriyaganesh@localhost/audition-tracker-test'
}