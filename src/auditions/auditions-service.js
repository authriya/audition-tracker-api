const AuditionsService = {
    getAllAuditions(knex) {
        return knex.select('*').from('auditions')
    },
    insertAudition(knex, newAudition) {
        return knex
            .insert(newAudition)
            .into('auditions')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    getById(knex, id) {
        return knex.from('auditions').select('*').where('id', id).first()
    },
    deleteAudition(knex, id) {
        return knex('auditions')
            .where({id})
            .delete()
    },
    updateAudition(knex, id, newAuditionFields) {
        return knex('auditions')
            .where({id})
            .update(newAuditionFields)
    }
}

module.exports = AuditionsService