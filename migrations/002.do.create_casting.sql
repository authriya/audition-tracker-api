CREATE TABLE casting (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    associates TEXT NOT NULL,
    preferences TEXT NOT NULL,
    user_id INTEGER
        REFERENCES audition_users(id) ON DELETE CASCADE NOT NULL
);