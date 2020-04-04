const path = require('path')
const express = require('express')
const xss = require('xss')
const AuditionsService = require('./auditions-service')
const {requireAuth} = require('../middleware/jwt-auth')

const auditionsRouter = express.Router()
const jsonParser = express.json()

const serializeAudition = audition => ({
    id: audition.id,
    castingOffice: audition.castingOffice,
    projectName: xss(audition.projectName),
    projectType: audition.projectType,
    roleType: audition.roleType,
    date: audition.date,
    clothingNotes: xss(audition.clothingNotes),
    rating: audition.rating,
    notes: xss(audition.notes),
    callback: audition.callback
})

auditionsRouter
    .route('/')
    .all(requireAuth)
    .get((req, res, next) => {
        AuditionsService.getAllAuditions(
            req.app.get('db'),
            req.user.id
        )
            .then(auditions => {
                res.json(auditions.map(serializeAudition))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const {id, castingOffice, projectName, projectType, roleType, date, clothingNotes, rating, notes, callback} = req.body
        const newAudition = {id, castingOffice, projectName, projectType, roleType, rating, date, clothingNotes} 
        for (const [key, value] of Object.entries(newAudition)) {
            if (value == '') {
                return res.status(400).json({
                    error: {message: `Missing '${key}' in request body`}
                })
            }
        }

        newAudition.notes = notes
        newAudition.callback = callback

        AuditionsService.insertAudition(
            req.app.get('db'),
            newAudition
        )
            .then(audition => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `${audition.id}`))
                    .json(serializeAudition(audition))
            })
            .catch(error => {
                console.log(error);
                next(error)
            })
    })

auditionsRouter
    .route('/:auditionId')
    .all(requireAuth)
    .all((req, res, next) => {
        AuditionsService.getById(
            req.app.get('db'),
            req.params.auditionId
        )
            .then(audition => {
                if(!audition) {
                    return res.status(404).json({
                        error: {message: `Audition doesn't exist`}
                    })
                }
                res.audition = audition 
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeAudition(res.audition))
    })
    .delete((req, res, next) => {
        AuditionsService.deleteAudition(
            req.app.get('db'),
            req.params.auditionId
        )
            .then(() => {
                res.status(204).end()
            })
    })
    .patch(jsonParser, (req, res, next) => {
        const {castingOffice, projectName, projectType, roleType, date, clothingNotes, rating, notes, callback} = req.body
        const auditionToUpdate = {castingOffice, projectName, projectType, roleType, rating} 
        const numberOfValues = Object.values(auditionToUpdate).filter(Boolean).length
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'castingOffice', 'projectName', 'projectType', 'roleType', or 'rating'`
                }
            })
        }
        auditionToUpdate.date = date
        auditionToUpdate.clothingNotes = clothingNotes
        auditionToUpdate.notes = notes
        auditionToUpdate.callback = callback
        AuditionsService.updateAudition(
            req.app.get('db'),
            req.params.auditionId,
            auditionToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = auditionsRouter