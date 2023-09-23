const fs = require('fs');
const bcrypt = require('bcrypt');

const saltRounds = 10;

const username = 'student';
const password = 'password';

const generatePasswordFile = async () => {
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userData = `${username}:${hashedPassword}\n`;

        fs.writeFileSync('passwords.txt', userData);
        console.log('Password file created successfully.');
    } catch (error) {
        console.error('Error:', error.message);
    }
};

generatePasswordFile();