# My SQLite App

This project is a simple Todo application built using JavaScript and SQLite. It allows users to create, read, update, and delete todo items.

## Project Structure

```
my-sqlite-app
├── src
│   ├── app.js          # Entry point of the application
│   ├── db
│   │   └── sqlite.js   # Database connection and query methods
│   └── models
│       └── todo.js     # Todo model with CRUD operations
├── package.json        # NPM configuration file
└── README.md           # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/my-sqlite-app.git
   ```

2. Navigate to the project directory:
   ```
   cd my-sqlite-app
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Start the application:
   ```
   node src/app.js
   ```

2. The server will be running on `http://localhost:3000`. You can use tools like Postman or curl to interact with the API.

## API Endpoints

- `GET /todos` - Retrieve all todo items
- `POST /todos` - Create a new todo item
- `PUT /todos/:id` - Update a todo item by ID
- `DELETE /todos/:id` - Delete a todo item by ID

## Contributing

Feel free to submit issues or pull requests to improve the project. 

## License

This project is licensed under the MIT License.