// models/User.js

class User {
    constructor(customer_id, name, email) {
        this.id = customer_id;
        this.name = name;
        this.email = email;
    }

    isAdmin() {
        return false; // base class default
    }
}

class Customer extends User {
    isAdmin() {
        return false;
    }
}

class Admin extends User {
    constructor(customer_id, name, email, permissions = []) {
        super(customer_id, name, email);
        this.permissions = permissions;
    }

    isAdmin() {
        return true;
    }

    can(permission) {
        return this.permissions.includes(permission);
    }
}

export { Customer, Admin };
