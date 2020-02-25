function makeAuditionsArray() {
    return [
        {
            id: 1,
            castingOffice: 1,
            projectName: "project one",
            projectType: "Film",
            roleType: "Lead",
            date: "2020-02-01T05:00:00.000Z",
            clothingNotes: "notes one two three",
            rating: 4,
            notes: "random notes",
            callback: true
        },
        {
            id: 2,
            castingOffice: 2,
            projectName: "project two",
            projectType: "TV",
            roleType: "Co-Star",
            date: "2020-02-01T05:00:00.000Z",
            clothingNotes: "notes one two three",
            rating: 3,
            notes: "random notes",
            callback: false
        },
        {
            id: 3,
            castingOffice: 3,
            projectName: "project three",
            projectType: "TV",
            roleType: "Guest Star",
            date: "2020-02-01T05:00:00.000Z",
            clothingNotes: "notes one two three",
            rating: 2,
            notes: "random notes",
            callback: false
        },
        {
            id: 4,
            castingOffice: 2,
            projectName: "project four",
            projectType: "Commercial",
            roleType: "Lead",
            date: "2020-02-01T05:00:00.000Z",
            clothingNotes: "notes one two three",
            rating: 5,
            notes: "random notes",
            callback: false,
        }
    ]
}

module.exports = { makeAuditionsArray}