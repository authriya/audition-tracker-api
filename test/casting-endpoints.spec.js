const {expect} = require('chai')
const knex = require('knex')
const app = require('../src/app')
const {makeCastingArray} = require('./casting.fixtures')
const {makeUsersArray} = require('./users.fixtures')

describe('Casting endpoints', function() {
    let db 
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL
        })
        app.set('db', db)
    })
    after('disconnect from db', () => db.destroy())
    before('clean the table', () => db.raw('TRUNCATE auditions, audition_users, casting RESTART IDENTITY CASCADE'))
    afterEach('cleanup',() => db.raw('TRUNCATE auditions, audition_users, casting RESTART IDENTITY CASCADE'))
    describe(`GET /api/casting`, () => {
        context(`Given no casting`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/casting')
                    .expect(200, [])
            })
        })
        context(`Given there is casting in the database`, () => {
            const testUsers = makeUsersArray()
            const testCasting = makeCastingArray()

            beforeEach('insert casting', () => {
                return db
                    .into('audition_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('casting')
                            .insert(testCasting)
                    })
            })
            it('responds 200 and all of the casting', () => {
                return supertest(app)
                    .get('/api/casting')
                    .expect(200, testCasting)
            })
        })
    })
    describe(`GET /api/casting/:castingId`, () => {
        context('Given no casting', () => {
            it(`responds with 404`, () => {
                const castingId = 123456
                return supertest(app)
                    .get(`/api/casting/${castingId}`)
                    .expect(404, {error: {message: `Casting doesn't exist`}})
            })
        })
        context('Given there is casting in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();

            beforeEach('insert casting', () => {
                return db
                    .into('audition_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('casting')
                            .insert(testCasting)
                    })
            })

            it('responds with 200 and the specified casting', () => {
                const castingId = 2
                const expectedCasting = testCasting[castingId -1]
                return supertest(app)
                    .get(`/api/casting/${castingId}`)
                    .expect(200, expectedCasting)
            })
        })
    })
    describe(`POST /api/casting`, () => {
        const testUsers = makeUsersArray()
            
        beforeEach('insert users', () => {
            return db
                .into('audition_users')
                .insert(testUsers)
        })

        it(`creates an article, responding with 201 and the new article`, () => {
            const newCasting = {
                name: 'casting office',
                address: 'address',
                email: 'an email',
                associates: 'associates1',
                preferences: 'preferences random',
                user_id: 1
            }
            return supertest(app)
                .post('/api/casting')
                .send(newCasting)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newCasting.name)
                    expect(res.body.address).to.eql(newCasting.address)
                    expect(res.body.email).to.eql(newCasting.email)
                    expect(res.body.associates).to.eql(newCasting.associates)
                    expect(res.body.preferences).to.eql(newCasting.preferences)
                    expect(res.body.user_id).to.eql(newCasting.user_id)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/casting/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                      .get(`/api/casting/${postRes.body.id}`)
                      .expect(postRes.body)
                )
        })
        const requiredFields = ['name', 'address', 'email', 'associates', 'preferences']
        requiredFields.forEach(field => {
            const newCasting = {
                name: 'casting office',
                address: 'address',
                email: 'an email',
                associates: 'associates1',
                preferences: 'preferences random',
                user_id: 1
            }
            it(`responds with 400 and an error message when ${field} is missing`, () => {
                delete newCasting[field]

                return supertest(app)
                    .post('/api/casting')
                    .send(newCasting)
                    .expect(400, {
                        error: {message: `Missing '${field}' in request body`}
                    })
            })
        })
    })
    describe(`PATCH /api/casting/:castingId`, () => {
        context(`Given no casting`, () => {
            it(`responds with 404`, () => {
                const castingId = 123456
                return supertest(app)
                    .patch(`/api/casting/${castingId}`)
                    .expect(404, {error: {message: `Casting doesn't exist`}})
            })
        })
        context(`Given there is casting in the database`, () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();

            beforeEach(`insert casting`, () => {
                return db
                    .into('audition_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('casting')
                            .insert(testCasting)
                    })
            })
            afterEach('cleanup',() => db.raw('TRUNCATE casting RESTART IDENTITY CASCADE'))

            it('responds with 204 and updates the article', () => {
                const idToUpdate = 2

                const updateCasting = {
                    name: 'updated name',
                    address: 'update address',
                    email: 'updated email',
                    associates: 'updated associates',
                    preferences: 'updated pref'
                }

                const expectedCasting = {
                    ...testCasting[idToUpdate -1],
                    ...updateCasting
                }

                return supertest(app)
                    .patch(`/api/casting/${idToUpdate}`)
                    .send(updateCasting)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get(`/api/casting/${idToUpdate}`)
                        .expect(expectedCasting))
            })
            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                
                return supertest(app)
                    .patch(`/api/casting/${idToUpdate}`)
                    .send({ irrelevant: 'foo'})
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'name', 'address', 'email', 'associates', or 'preferences'`
                        }
                    })
            })
            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 1
                const updateCasting = {
                    name: 'updated name'
                }
                const expectedCasting = {
                    ...testCasting[idToUpdate -1],
                    ...updateCasting
                }
                return supertest(app)
                    .patch(`/api/casting/${idToUpdate}`)
                    .send({
                     ...updateCasting,
                    fieldToIgnore: 'should not be in GET response'})
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get(`/api/casting/${idToUpdate}`)
                        .expect(expectedCasting)
                    )
            })
        })
    })
})