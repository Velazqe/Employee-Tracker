import inquirer from 'inquirer';
import pkg from 'pg';
import consoleTable from 'console.table';

const { Client } = pkg;

// Create a connection to the database
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'company_db',
  password: 'root',
  port: 5432,
});

client.connect(err => {
  if (err) throw err;
  console.log('Connected to the database.');
  startApp();
});

function startApp() {
  inquirer.prompt({
    name: 'action',
    type: 'list',
    message: 'What would you like to do?',
    choices: [
      'View all departments',
      'View all roles',
      'View all employees',
      'Add a department',
      'Add a role',
      'Add an employee',
      'Update an employee role',
      'Exit'
    ]
  }).then(answer => {
    switch (answer.action) {
      case 'View all departments':
        viewAllDepartments();
        break;
      case 'View all roles':
        viewAllRoles();
        break;
      case 'View all employees':
        viewAllEmployees();
        break;
      case 'Add a department':
        addDepartment();
        break;
      case 'Add a role':
        addRole();
        break;
      case 'Add an employee':
        addEmployee();
        break;
      case 'Update an employee role':
        updateEmployeeRole();
        break;
      case 'Exit':
        client.end();
        break;
    }
  });
}

function viewAllDepartments() {
  client.query('SELECT * FROM department', (err, res) => {
    if (err) throw err;
    console.table(res.rows);
    startApp();
  });
}

function viewAllRoles() {
  const query = `
    SELECT role.id, role.title, department.name AS department, role.salary
    FROM role
    INNER JOIN department ON role.department_id = department.id
  `;
  client.query(query, (err, res) => {
    if (err) throw err;
    console.table(res.rows);
    startApp();
  });
}

function viewAllEmployees() {
  const query = `
    SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, 
    CONCAT(manager.first_name, ' ', manager.last_name) AS manager
    FROM employee
    LEFT JOIN role ON employee.role_id = role.id
    LEFT JOIN department ON role.department_id = department.id
    LEFT JOIN employee manager ON manager.id = employee.manager_id
  `;
  client.query(query, (err, res) => {
    if (err) throw err;
    console.table(res.rows);
    startApp();
  });
}

function addDepartment() {
  inquirer.prompt({
    name: 'name',
    type: 'input',
    message: 'What is the name of the department?'
  }).then(answer => {
    client.query('INSERT INTO department (name) VALUES ($1)', [answer.name], (err) => {
      if (err) throw err;
      console.log('Department added successfully!');
      startApp();
    });
  });
}

function addRole() {
  client.query('SELECT * FROM department', (err, res) => {
    if (err) throw err;
    inquirer.prompt([
      {
        name: 'title',
        type: 'input',
        message: 'What is the title of the role?'
      },
      {
        name: 'salary',
        type: 'input',
        message: 'What is the salary for the role?'
      },
      {
        name: 'department_id',
        type: 'list',
        choices: res.rows.map(department => ({
          name: department.name,
          value: department.id
        })),
        message: 'Which department does the role belong to?'
      }
    ]).then(answer => {
      client.query('INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)', 
      [answer.title, answer.salary, answer.department_id], (err) => {
        if (err) throw err;
        console.log('Role added successfully!');
        startApp();
      });
    });
  });
}

function addEmployee() {
  client.query('SELECT * FROM role', (err, rolesRes) => {
    if (err) throw err;
    client.query('SELECT * FROM employee', (err, employeesRes) => {
      if (err) throw err;
      inquirer.prompt([
        {
          name: 'first_name',
          type: 'input',
          message: 'What is the first name of the employee?'
        },
        {
          name: 'last_name',
          type: 'input',
          message: 'What is the last name of the employee?'
        },
        {
          name: 'role_id',
          type: 'list',
          choices: rolesRes.rows.map(role => ({
            name: role.title,
            value: role.id
          })),
          message: 'What is the role of the employee?'
        },
        {
          name: 'manager_id',
          type: 'list',
          choices: [{ name: 'None', value: null }].concat(
            employeesRes.rows.map(employee => ({
              name: `${employee.first_name} ${employee.last_name}`,
              value: employee.id
            }))
          ),
          message: 'Who is the manager of the employee?'
        }
      ]).then(answer => {
        client.query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)', 
        [answer.first_name, answer.last_name, answer.role_id, answer.manager_id], (err) => {
          if (err) throw err;
          console.log('Employee added successfully!');
          startApp();
        });
      });
    });
  });
}

function updateEmployeeRole() {
  client.query('SELECT * FROM employee', (err, employeesRes) => {
    if (err) throw err;
    client.query('SELECT * FROM role', (err, rolesRes) => {
      if (err) throw err;
      inquirer.prompt([
        {
          name: 'employee_id',
          type: 'list',
          choices: employeesRes.rows.map(employee => ({
            name: `${employee.first_name} ${employee.last_name}`,
            value: employee.id
          })),
          message: 'Which employee\'s role do you want to update?'
        },
        {
          name: 'role_id',
          type: 'list',
          choices: rolesRes.rows.map(role => ({
            name: role.title,
            value: role.id
          })),
          message: 'What is the new role of the employee?'
        }
      ]).then(answer => {
        client.query('UPDATE employee SET role_id = $1 WHERE id = $2', 
        [answer.role_id, answer.employee_id], (err) => {
          if (err) throw err;
          console.log('Employee role updated successfully!');
          startApp();
        });
      });
    });
  });
}
