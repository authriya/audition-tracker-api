const path = require('path')
const express = require('express')
const CastingService = require('./casting-service')
const {requireAuth} = require('../middleware/jwt-auth')

const castingRouter = express.Router()
const jsonParser = express.json()

const serializeCasting = casting => ({
    id: casting.id,
    name: casting.name,
    address: casting.address,
    email: casting.email,
    associates: casting.associates,
    preferences: casting.preferences,
    user_id: casting.user_id
})

castingRouter
    .route('/')
    .all(requireAuth)
    .get((req, res, next) => {
        CastingService.getAllCasting(
            req.app.get('db')
        )
            .then(casting => {
                res.json(casting.map(serializeCasting))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const {name, address, email, associates, preferences, user_id} = req.body
        const newCasting = {name, address, email, associates, preferences}

        for(const [key, value] of Object.entries(newCasting)) {
            if (value == null) {
                return res.status(400).json({
                    error: {message: `Missing '${key}' in request body`}
                })
            }
        }
        newCasting.user_id = user_id

        CastingService.insertCasting(
            req.app.get('db'),
            newCasting
        )
            .then(casting => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${casting.id}`))
                    .json(serializeCasting(casting))
            })
            .catch(next)
    })

castingRouter
    .route('/:castingId')
    .all(requireAuth)
    .all((req, res, next) => {
        CastingService.getById(
            req.app.get('db'),
            req.params.castingId
        )
            .then(casting => {
                if(!casting) {
                    return res.status(404).json({
                        error: {message: `Casting doesn't exist`}
                    })
                }
                res.casting = casting
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeCasting(res.casting))
    })
    .patch(jsonParser, (req, res, next) => {
        const {name, address, email, associates, preferences} = req.body
        const castingToUpdate = {name, address, email, associates, preferences}

        const numberOfValues = Object.values(castingToUpdate).filter(Boolean).length
        if(numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'name', 'address', 'email', 'associates', or 'preferences'`
                }
            })
        }
        CastingService.updateCasting(
            req.app.get('db'),
            req.params.castingId,
            castingToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
module.exports = castingRouter