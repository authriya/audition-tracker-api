const path = require('path')
const express = require('express')
const xss = require('xss')
const AuditionsService = require('./auditions-service')

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
    .get((req, res, next) => {
        AuditionsService.getAllAuditions(
            req.app.get('db')
        )
            .then(auditions => {
                res.json(auditions.map(serializeAudition))
            })
            .catch(next)
    })

auditionsRouter
    .route('/:auditionId')
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

module.exports = auditionsRouter