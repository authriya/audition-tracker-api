require('dotenv').config()
const {expect} = require('chai')
const knex = require('knex')
const app = require('../src/app')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {makeAuditionsArray} = require('./auditions.fixtures')
const {makeCastingArray} = require('./casting.fixtures')
const {makeUsersArray} = require('./users.fixtures')

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
    const token = jwt.sign({ user_id: user.id }, secret, {
      subject: user.user_name,
      algorithm: 'HS256',
    })
    return `Bearer ${token}`
  }
function seedUsers(db, users) {
    const preppedUsers = users.map(user => ({
      ...user,
      password: bcrypt.hashSync(user.password, 1)
    }))
    return db.into('audition_users').insert(preppedUsers)
      .then(() =>
        // update the auto sequence to stay in sync
        db.raw(
          `SELECT setval('audition_users_id_seq', ?)`,
          [users[users.length - 1].id],
        )
      )
  }
  function seedAuditionsTables(db, users, casting, auditions=[]) {
    // use a transaction to group the queries and auto rollback on any failure
    return db.transaction(async trx => {
      await seedUsers(trx, users)
      await trx.into('casting').insert(casting)
      // update the auto sequence to match the forced id values
      await trx.raw(
        `SELECT setval('casting_id_seq', ?)`,
        [casting[casting.length - 1].id],
      )
      // only insert comments if there are some, also update the sequence counter
      if (auditions.length) {
        await trx.into('auditions').insert(auditions)
        await trx.raw(
          `SELECT setval('auditions_id_seq', ?)`,
          [auditions[auditions.length - 1].id],
        )
      }
    })
  }

describe('Auditions Endpoints', function() {
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
        const testUsers = makeUsersArray();
        context(`Given no auditions`, () => {
        
            it(`responds 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/auditions')
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(200, [])
            })
        })

        context('Given there are auditions in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();
            const testAuditions = makeAuditionsArray();

            beforeEach('insert auditions', () =>
            seedAuditionsTables(
              db,
              testUsers,
              testCasting,
              testAuditions,
            ))

            it('responds 200 and all of the auditions', () => {
                return supertest(app)
                    .get('/api/auditions')
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(200, testAuditions)
            })
        })
    })

    describe(`GET /api/auditions/:auditionId`, () => {
        context('Given no auditions', () => {
            const testUsers = makeUsersArray();
            it(`responds with 404`, () => {
                const auditionId = 123456
                return supertest(app)
                    .get(`/api/auditions/${auditionId}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(404, {error: {message: `Audition doesn't exist`}})
            })
        })
        context('Given there are auditions in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();
            const testAuditions = makeAuditionsArray();

            beforeEach('insert auditions', () =>
            seedAuditionsTables(
              db,
              testUsers,
              testCasting,
              testAuditions,
            ))

            it('responds with 200 and the specified audition', () => {
                const auditionId = 2
                const expectedAudition = testAuditions[auditionId - 1]
                return supertest(app)
                    .get(`/api/auditions/${auditionId}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(200, expectedAudition)
            })
        })
    })
    describe(`POST /api/auditions`, () => {
        const testUsers = makeUsersArray();
        const testCasting = makeCastingArray();

        beforeEach('insert auditions', () =>
            seedAuditionsTables(
              db,
              testUsers,
              testCasting,
        ))
        it(`creates an audition, responding with 201 and the new audition`, () => {
            const newAudition = {
                castingOffice: 1,
                projectName: 'a name',
                projectType: 'Film',
                roleType: 'Lead',
                clothingNotes: 'notes',
                rating: 4,
                notes: 'notes notes',
                callback: false
            }
            return supertest(app)
                .post('/api/auditions')
                .set('Authorization', makeAuthHeader(testUsers[0]))
                .send(newAudition)
                .expect(201)
                .expect(res => {
                    expect(res.body.projectName).to.eql(newAudition.projectName)
                    expect(res.body.projectType).to.eql(newAudition.projectType)
                    expect(res.body.roleType).to.eql(newAudition.roleType)
                    expect(res.body.clothingNotes).to.eql(newAudition.clothingNotes)
                    expect(res.body.rating).to.eql(newAudition.rating)
                    expect(res.body.notes).to.eql(newAudition.notes)
                    expect(res.body.callback).to.eql(newAudition.callback)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/auditions/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/auditions/${postRes.body.id}`)
                        .set('Authorization', makeAuthHeader(testUsers[0]))
                        .expect(postRes.body))
        })
        const requiredFields = ['castingOffice', 'projectName', 'projectType', 'roleType', 'rating']
        requiredFields.forEach(field => {
            const newAudition = {
                castingOffice: 1,
                projectName: 'name',
                projectType: 'Film',
                roleType: 'Lead',
                rating: 5
            }
            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newAudition[field]

                return supertest(app)
                    .post('/api/auditions')
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .send(newAudition)
                    .expect(400, {
                        error: {message: `Missing '${field}' in request body`}
                    })
            })
        })
    })
    describe(`DELETE /api/auditions/:auditionId`, () => {
        context(`Given no articles`, () => {
            const testUsers = makeUsersArray();
            it(`responds with 404`, () => {
                const auditionId = 1234
                return supertest(app)
                    .delete(`/api/auditions/${auditionId}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(404, {error: {message: `Audition doesn't exist`}})
            })
        })
        context('Given there are auditions in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();
            const testAuditions = makeAuditionsArray();

            beforeEach('insert auditions', () =>
                seedAuditionsTables(
                db,
                testUsers,
                testCasting,
                testAuditions,
            ))
            it('responds with 204 and removes the article', () => {
                const idToRemove = 2
                const expectedAudition = testAuditions.filter(audition => audition.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/auditions/${idToRemove}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(204)
                    .then(res =>
                        supertest(app)
                        .get(`/api/auditions`)
                        .set('Authorization', makeAuthHeader(testUsers[0]))
                        .expect(expectedAudition))
            })
        })
    })
    describe(`PATCH /api/auditions/:auditionId`, () => {
        context(`Given no auditions`, () => {
            const testUsers = makeUsersArray();
            it(`responds with 404`, () => {
                const auditionId = 123456
                return supertest(app)
                    .patch(`/api/auditions/${auditionId}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .expect(404, {error: {message: `Audition doesn't exist`}})
            })
        })
        context('Given there are articles in the database', () => {
            const testUsers = makeUsersArray();
            const testCasting = makeCastingArray();
            const testAuditions = makeAuditionsArray();

            beforeEach('insert auditions', () =>
                seedAuditionsTables(
                db,
                testUsers,
                testCasting,
                testAuditions,
            ))

            afterEach('cleanup',() => db.raw('TRUNCATE audition_users, casting, auditions RESTART IDENTITY CASCADE'))
            
            it('responds with 204 and updates the article', () => {
                const idToUpdate = 2
                const updatedAudition = {
                    castingOffice: 1,
                    projectName: 'a name',
                    projectType: 'Film',
                    roleType: 'Lead',
                    clothingNotes: 'notes',
                    rating: 4,
                    notes: 'notes notes',
                    callback: false
                }
                const expectedAudition = {
                    ...testAuditions[idToUpdate - 1],
                    ...updatedAudition
                }
                return supertest(app)
                    .patch(`/api/auditions/${idToUpdate}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .send(updatedAudition)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/auditions/${idToUpdate}`)
                            .set('Authorization', makeAuthHeader(testUsers[0]))
                            .expect(expectedAudition))
            })
            it(`responds with 400 when no required fields are supplied`, () => {
                const idToUpdate = 2

                return supertest(app)
                    .patch(`/api/auditions/${idToUpdate}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .send({ irrelevantField: 'foo'})
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'castingOffice', 'projectName', 'projectType', 'roleType', or 'rating'`
                        }
                    })
            })
            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updatedAudition = {
                    projectName: 'updated name'
                }
                const expectedAudition = {
                    ...testAuditions[idToUpdate -1],
                    ...updatedAudition
                }
                return supertest(app)
                    .patch(`/api/auditions/${idToUpdate}`)
                    .set('Authorization', makeAuthHeader(testUsers[0]))
                    .send({
                        ...updatedAudition,
                        fieldToIgnore: 'should not be here'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get(`/api/auditions/${idToUpdate}`)
                        .set('Authorization', makeAuthHeader(testUsers[0]))
                        .expect(expectedAudition))
            })
        })
    })
})