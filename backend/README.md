# DORA Backend

## DEV Environment Setup

### Pre-requirements
1. PostgreSQL database (pg_vector extension is needed)
2. Redis

If you don't have them running on the dev environment, you may start them as docker containers.

Install the pgvector extension by connection to the DB and running the SQL:
```
psql -h 127.0.0.1 -p 5432 -U dora -d dora
dora=# CREATE EXTENSION vector;
dora=# SELECT * FROM pg_extension;
  oid  | extname | extowner | extnamespace | extrelocatable | extversion | extconfig | extcondition
-------+---------+----------+--------------+----------------+------------+-----------+--------------
 13564 | plpgsql |       10 |           11 | f              | 1.0        |           |
 23283 | vector  |       10 |         2200 | t              | 0.7.4      |           |
```

### Local debug
1. Copy `.env.example` file to `.env` file for development, supply variables needed for you feature.
2. `uv sync` (make sure `uv` is installed: [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/))
3. `./manage.py migrate`
5. `./manage.py createsuperuser`
6. Run this to start the API server: `./manage.py runserver`
7. Run this to start the celery worker: `celery -A app worker -l INFO`
8. Run this to start the websocket server: `daphne --bind 0.0.0.0 --port 8081 app.asgi:application`

### VSCode Integration
The project includes VSCode configurations for an optimal development experience:

1. **Pre-configured Settings**: The repository includes `.vscode/settings.json` with Ruff integration for formatting and linting.

2. **Extension Requirement**: Install the Ruff extension:
   - Search for "Ruff" in the Extensions marketplace
   - Install "Ruff" by Charlie Marsh

3. **Features Enabled**: With this setup, you'll automatically get:
   - **Format on Save**: Code will be automatically formatted when you save files
   - **Real-time Linting**: Issues will be highlighted as you type
   - **Import Sorting**: Imports will be automatically organized


### Admin Panel
Login [Admin Panel](http://localhost:8080/admin/) with the superuser name and password that you created previously.

You may issue an API token, so that you don't have to login and get session cookie for all your subsequent requests. Do this: Admin Panel -> Auth Token -> Tokens -> Add -> Choose your username from the dropdown -> Save. You will get a random token key like `5a94c8d34f00000f05447470b752d0c594abcdef`.

### API Schema
http://localhost:8080/api/schema/swagger-ui/

### Make API requests
You may authorize yourself and make requests on API schema page. Alternatively you may use curl to make requests, e.g.

```
curl --location 'http://localhost:8080/api/v1/templates/' \
--header 'Authorization: Bearer 5a94c8d34f42977f05447470b752d0c594abcdef' \
--header 'Content-Type: application/json'
```


## Development

### Contribute code
1. Move task to "In Progress"
2. Pull latest `develop` branch `git pull origin develop`
3. Checkout your own feature branch following the naming convension `git checkout -b feature/DORA-123_update_readme`
4. Develop and commit code `git commit -m "Update README"`
5. Push to Gitlab `git push origin feature/DORA-123_update_readme`
6. Raise Merge Request (source: your feature branch; target: `develop`) and request for code review
7. Move task to "QA Queue" when Code Review approved

### Package Management

To install additional third-party libraries:
```bash
uv add <package-name>
```

For development dependencies:
```bash
uv add --dev <package-name>
```

### Linters & pre-commit-check

For init pre-commit checks, don't forget about `pre-commit install`

## DORA Frontend
[README](../frontend/README.md)
