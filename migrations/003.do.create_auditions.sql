CREATE TABLE auditions (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    "castingOffice" INTEGER
        REFERENCES casting(id) ON DELETE CASCADE NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    date DATE default now() NOT NULL,
    "clothingNotes" TEXT,
    rating INTEGER NOT NULL,
    notes TEXT,
    callback BOOLEAN
);