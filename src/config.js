module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'https://audition-tracker.authriya.now.sh/',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://supriyaganesh@localhost/audition-tracker',
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://supriyaganesh@localhost/audition-tracker-test',
    JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '3h',
}