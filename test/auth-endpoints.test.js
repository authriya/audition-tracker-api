const knex = require('knex')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const {makeUsersArray} = require('./users.fixtures')

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

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
    const token = jwt.sign({ user_id: user.id }, secret, {
      subject: user.user_name,
      algorithm: 'HS256',
    })
    return `Bearer ${token}`
}

function cleanTables(db) {
    return db.transaction(trx =>
      trx.raw(
        `TRUNCATE
          audition_users,
          auditions,
          casting
        `
      )
      .then(() =>
        Promise.all([
          trx.raw(`ALTER SEQUENCE audition_users_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE casting_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE auditions_id_seq minvalue 0 START WITH 1`),
          trx.raw(`SELECT setval('audition_users_id_seq', 0)`),
          trx.raw(`SELECT setval('casting_id_seq', 0)`),
          trx.raw(`SELECT setval('auditions_id_seq', 0)`),
        ])
      )
    )
  }

describe.only('Auth Endpoints', function() {
  let db

  const testUsers = makeUsersArray()
  const testUser = testUsers[1]

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => cleanTables(db))

  afterEach('cleanup', () => cleanTables(db))

  describe(`POST /api/auth/login`, () => {
    beforeEach('insert users', () =>
      seedUsers(
        db,
        testUsers,
      )
    )

    const requiredFields = ['user_name', 'password']

    requiredFields.forEach(field => {
      const loginAttemptBody = {
        user_name: testUser.user_name,
        password: testUser.password,
      }

      it(`responds with 400 required error when '${field}' is missing`, () => {
        delete loginAttemptBody[field]

        return supertest(app)
          .post('/api/auth/login')
          .send(loginAttemptBody)
          .expect(400, {
            error: `Missing '${field}' in request body`,
          })
      })
    })

    it(`responds 400 'invalid username or password' when bad username`, () => {
      const userInvalidUser = { user_name: 'user-not', password: 'existy' }
      return supertest(app)
        .post('/api/auth/login')
        .send(userInvalidUser)
        .expect(400, { error: `Incorrect username or password` })
    })

    it(`responds 400 'invalid username or password' when bad password`, () => {
      const userInvalidPass = { user_name: testUser.user_name, password: 'incorrect' }
      return supertest(app)
        .post('/api/auth/login')
        .send(userInvalidPass)
        .expect(400, { error: `Incorrect username or password` })
    })

    it(`responds 200 and JWT auth token using secret when valid credentials`, () => {
      const userValidCreds = {
        user_name: testUser.user_name,
        password: testUser.password,
      }
      const expectedToken = jwt.sign(
        { user_id: testUser.id },
        process.env.JWT_SECRET,
        {
          subject: testUser.user_name,
          expiresIn: process.env.JWT_EXPIRY,
          algorithm: 'HS256',
        }
      )
      return supertest(app)
        .post('/api/auth/login')
        .send(userValidCreds)
        .expect(200, {
          authToken: expectedToken,
        })
    })
  })

  describe(`POST /api/auth/refresh`, () => {
    beforeEach('insert users', () =>
      seedUsers(
        db,
        testUsers,
      )
    )

    it(`responds 200 and JWT auth token using secret`, () => {
      const expectedToken = jwt.sign(
        { user_id: testUser.id },
        process.env.JWT_SECRET,
        {
          subject: testUser.user_name,
          expiresIn: process.env.JWT_EXPIRY,
          algorithm: 'HS256',
        }
      )
      return supertest(app)
        .post('/api/auth/refresh')
        .set('Authorization', makeAuthHeader(testUser))
        .expect(200, {
          authToken: expectedToken,
        })
    })
  })
})