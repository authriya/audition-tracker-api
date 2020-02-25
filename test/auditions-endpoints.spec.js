const {expect} = require('chai')
const knex = require('knex')
const app = require('../src/app')
const {makeAuditionsArray} = require('./auditions.fixtures')
const {makeCastingArray} = require('./casting.fixtures')
const {makeUsersArray} = require('./users.fixtures')

describe.only('Auditions Endpoints', function() {
    let db 

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        })
        app.set('db', db)
    })
    after('disconnect from db', () => db.destroy())
    before('clean the table', () => db.raw('TRUNCATE auditions, audition_users, casting RESTART IDENTITY CASCADE'))
    afterEach('cleanup',() => db.raw('TRUNCATE auditions, audition_users, casting RESTART IDENTITY CASCADE'))

    describe(`GET /api/auditions`, () => {
        
        context(`Given no auditions`, () => {
            it(`responds 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/auditions')
                    .expect(200, [])
            })
        })

        context('Given there are auditions in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();
            const testAuditions = makeAuditionsArray();

            beforeEach('insert auditions', () => {
                return db
                    .into('audition_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('casting')
                            .insert(testCasting)
                            .then(() => {
                                return db
                                    .into('auditions')
                                    .insert(testAuditions)
                            })
                    })
            })

            it('responds 200 and all of the auditions', () => {
                return supertest(app)
                    .get('/api/auditions')
                    .expect(200, testAuditions)
            })
        })
    })

    describe(`GET /api/auditions/:auditionId`, () => {
        context('Given no auditions', () => {
            it(`responds with 404`, () => {
                const auditionId = 123456
                return supertest(app)
                    .get(`/api/auditions/${auditionId}`)
                    .expect(404, {error: {message: `Audition doesn't exist`}})
            })
        })
        context('Given there are auditions in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();
            const testAuditions = makeAuditionsArray();

            beforeEach('insert auditions', () => {
                return db
                    .into('audition_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('casting')
                            .insert(testCasting)
                            .then(() => {
                                return db
                                    .into('auditions')
                                    .insert(testAuditions)
                            })
                    })
            })
            it('responds with 200 and the specified audition', () => {
                const auditionId = 2
                const expectedAudition = testAuditions[auditionId - 1]
                return supertest(app)
                    .get(`/api/auditions/${auditionId}`)
                    .expect(200, expectedAudition)
            })
        })
    })
})