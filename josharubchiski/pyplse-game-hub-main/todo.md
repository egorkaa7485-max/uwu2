# TODO: Migrate to Local SQLite with SQLCipher

## Completed Tasks
- [x] Analyze current MySQL setup in server.js
- [x] Read .env file contents (DB_HOST=localhost, DB_USER=root, DB_PASSWORD=, DB_NAME=pyplse_game_hub, PORT=3001)

## Pending Tasks
- [ ] Update package.json: Remove mysql2, add better-sqlite3
- [ ] Update server.js: Replace MySQL with SQLite + SQLCipher
- [ ] Update .env: Change to DB_PATH and DB_KEY
- [ ] Install dependencies
- [ ] Test server startup and API endpoints
- [ ] Verify database file creation and encryption
