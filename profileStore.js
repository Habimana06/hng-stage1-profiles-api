const { db } = require("./db");

function getProfileById(id) {
  return db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) || null;
}

function getProfileByName(normalizedName) {
  return db.prepare("SELECT * FROM profiles WHERE name = ?").get(normalizedName) || null;
}

function insertProfile(profile) {
  db.prepare(
    `
    INSERT INTO profiles (
      id,
      name,
      gender,
      gender_probability,
      sample_size,
      age,
      age_group,
      country_id,
      country_probability,
      created_at
    ) VALUES (
      @id,
      @name,
      @gender,
      @gender_probability,
      @sample_size,
      @age,
      @age_group,
      @country_id,
      @country_probability,
      @created_at
    )
  `
  ).run(profile);
}

function deleteProfileById(id) {
  const info = db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
  return info.changes;
}

function listProfiles(filters) {
  const where = [];
  const params = {};

  if (filters.gender) {
    where.push("LOWER(gender) = LOWER(@gender)");
    params.gender = filters.gender;
  }
  if (filters.country_id) {
    where.push("LOWER(country_id) = LOWER(@country_id)");
    params.country_id = filters.country_id;
  }
  if (filters.age_group) {
    where.push("LOWER(age_group) = LOWER(@age_group)");
    params.age_group = filters.age_group;
  }

  const sql = `
    SELECT id, name, gender, age, age_group, country_id
    FROM profiles
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
  `;

  return db.prepare(sql).all(params);
}

module.exports = {
  getProfileById,
  getProfileByName,
  insertProfile,
  deleteProfileById,
  listProfiles,
};

