# HNG Backend Wizards — Stage 1

## Base URL

After deployment, your base URL will look like `https://your-app.domain`.

## CORS

This API sets `Access-Control-Allow-Origin: *` (required for grading).

## Endpoints

### 1) Create Profile

`POST /api/profiles`

Request body:

```json
{ "name": "ella" }
```

Success (201 Created):

```json
{
  "status": "success",
  "data": {
    "id": "019d908f-751a-7948-8fa2-ebd48a186770",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

If the same name comes in again (idempotent):

```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": {
    "id": "019d908f-751a-7948-8fa2-ebd48a186770",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

### 2) Get Single Profile

`GET /api/profiles/{id}`

Success (200):

```json
{
  "status": "success",
  "data": {
    "id": "019d908f-751a-7948-8fa2-ebd48a186770",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

### 3) Get All Profiles

`GET /api/profiles`

Optional query params: `gender`, `country_id`, `age_group` (case-insensitive).

Success (200):

```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

### 4) Delete Profile

`DELETE /api/profiles/{id}` returns **204 No Content** on success.

## Error format

All errors return:

```json
{ "status": "error", "message": "<error message>" }
```

External API invalid response (502):

```json
{ "status": "error", "message": "Genderize returned an invalid response" }
```

Where external API is one of: `Genderize`, `Agify`, `Nationalize`.

## Local setup

```bash
cd Stageone
npm install
npm start
```

## Persistence

SQLite database is stored at `Stageone/data.sqlite` by default.

Optional env var:

- `SQLITE_PATH`: override the SQLite file location

