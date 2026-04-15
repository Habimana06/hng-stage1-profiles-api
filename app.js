const express = require("express");
const { uuidv7 } = require("uuidv7");
const {
  getProfileById,
  getProfileByName,
  insertProfile,
  deleteProfileById,
  listProfiles,
} = require("./profileStore");

const app = express();
const UPSTREAM_TIMEOUT_MS = 4000;

app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(422).json({ status: "error", message: "Invalid type" });
  }
  return next(err);
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send();
  next();
});

function normalizeName(value) {
  return value.trim().toLowerCase();
}

function ageToGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

async function fetchJsonOrThrow(url, externalApi) {
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    const error = new Error(`${externalApi} request failed`);
    error.kind = "UPSTREAM_FAILURE";
    error.externalApi = externalApi;
    throw error;
  }

  if (!upstreamResponse.ok) {
    const error = new Error(`${externalApi} returned non-2xx`);
    error.kind = "UPSTREAM_FAILURE";
    error.externalApi = externalApi;
    throw error;
  }

  try {
    return await upstreamResponse.json();
  } catch {
    const error = new Error(`${externalApi} returned invalid JSON`);
    error.kind = "UPSTREAM_INVALID";
    error.externalApi = externalApi;
    throw error;
  }
}

function invalidUpstream(externalApi) {
  return {
    status: "error",
    message: `${externalApi} returned an invalid response`,
  };
}

app.post("/api/profiles", async (req, res) => {
  const { name } = req.body || {};

  if (name === undefined || name === null || name === "") {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty name" });
  }

  if (typeof name !== "string") {
    return res.status(422).json({ status: "error", message: "Invalid type" });
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty name" });
  }

  const normalized = normalizeName(trimmed);
  const existing = getProfileByName(normalized);
  if (existing) {
    return res.status(200).json({
      status: "success",
      message: "Profile already exists",
      data: existing,
    });
  }

  try {
    const [genderize, agify, nationalize] = await Promise.all([
      fetchJsonOrThrow(
        `https://api.genderize.io?name=${encodeURIComponent(normalized)}`,
        "Genderize"
      ),
      fetchJsonOrThrow(
        `https://api.agify.io?name=${encodeURIComponent(normalized)}`,
        "Agify"
      ),
      fetchJsonOrThrow(
        `https://api.nationalize.io?name=${encodeURIComponent(normalized)}`,
        "Nationalize"
      ),
    ]);

    const gender = genderize.gender;
    const genderProbability = Number(genderize.probability);
    const sampleSize = Number(genderize.count);
    if (
      gender === null ||
      sampleSize === 0 ||
      Number.isNaN(genderProbability) ||
      Number.isNaN(sampleSize)
    ) {
      return res.status(502).json(invalidUpstream("Genderize"));
    }

    const age = agify.age;
    const ageNumber = Number(age);
    if (age === null || Number.isNaN(ageNumber)) {
      return res.status(502).json(invalidUpstream("Agify"));
    }

    const countries = Array.isArray(nationalize.country)
      ? nationalize.country
      : [];
    if (countries.length === 0) {
      return res.status(502).json(invalidUpstream("Nationalize"));
    }
    const top = countries.reduce((best, cur) => {
      if (!best) return cur;
      return (cur.probability ?? 0) > (best.probability ?? 0) ? cur : best;
    }, null);

    const countryId = top?.country_id;
    const countryProbability = Number(top?.probability);
    if (!countryId || Number.isNaN(countryProbability)) {
      return res.status(502).json(invalidUpstream("Nationalize"));
    }

    const profile = {
      id: uuidv7(),
      name: normalized,
      gender,
      gender_probability: genderProbability,
      sample_size: sampleSize,
      age: ageNumber,
      age_group: ageToGroup(ageNumber),
      country_id: countryId,
      country_probability: countryProbability,
      created_at: new Date().toISOString(),
    };

    insertProfile(profile);

    return res.status(201).json({
      status: "success",
      data: profile,
    });
  } catch (err) {
    if (err?.kind === "UPSTREAM_FAILURE") {
      return res
        .status(502)
        .json({ status: "error", message: "Upstream service failure" });
    }
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

app.get("/api/profiles/:id", (req, res) => {
  const { id } = req.params;
  const profile = getProfileById(id);
  if (!profile) {
    return res
      .status(404)
      .json({ status: "error", message: "Profile not found" });
  }

  return res.status(200).json({ status: "success", data: profile });
});

app.get("/api/profiles", (req, res) => {
  const { gender, country_id, age_group } = req.query || {};

  const candidates = { gender, country_id, age_group };
  for (const [key, value] of Object.entries(candidates)) {
    if (value === undefined) continue;
    if (typeof value !== "string") {
      return res.status(422).json({ status: "error", message: "Invalid type" });
    }
    if (value.trim() === "") {
      delete candidates[key];
    } else {
      candidates[key] = value.trim();
    }
  }

  const data = listProfiles(candidates);
  return res.status(200).json({ status: "success", count: data.length, data });
});

app.delete("/api/profiles/:id", (req, res) => {
  const { id } = req.params;
  const changes = deleteProfileById(id);
  if (!changes) {
    return res
      .status(404)
      .json({ status: "error", message: "Profile not found" });
  }
  return res.status(204).send();
});

module.exports = { app };

