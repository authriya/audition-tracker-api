const CastingService = {
    getAllCasting(knex, id) {
        return knex.select('*').from('casting').where('user_id', id)
    },
    insertCasting(knex, newCasting) {
        return knex
            .insert(newCasting)
            .into('casting')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    getById(knex, id) {
        return knex.from('casting').select('*').where('id', id).first()
    },
    updateCasting(knex, id, newCastingFields) {
        return knex('casting')
            .where({id})
            .update(newCastingFields)
    }
}

module.exports = CastingService