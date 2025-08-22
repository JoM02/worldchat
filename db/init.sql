-- Create User table first
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('student', 'teacher')) NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active', -- [Active, Searching, Busy]
    languages VARCHAR(255),
    ip VARCHAR(50)
);

-- Create Conversation table next
CREATE TABLE "Conversation" (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES "User"(id) ON DELETE CASCADE,
    teacher_id INT REFERENCES "User"(id) ON DELETE CASCADE,
    language VARCHAR(10), 
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'random' CHECK (status IN ('random', 'private', 'ended')) -- Updated status values
);

-- Create Message table last
CREATE TABLE "Message" (
    id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES "Conversation"(id) ON DELETE CASCADE,
    sender_id INT REFERENCES "User"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Unread', -- [Unread, Read, Deleted]
    has_image BOOLEAN DEFAULT FALSE
);

-- Create Image table
CREATE TABLE "Image" (
    id SERIAL PRIMARY KEY,
    message_id INT REFERENCES "Message"(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster image lookups
CREATE INDEX idx_image_message_id ON "Image"(message_id);

-- Create Contact table
CREATE TABLE "Contact" (
    id SERIAL PRIMARY KEY,
    user_id_1 INT REFERENCES "User"(id) ON DELETE CASCADE,
    user_id_2 INT REFERENCES "User"(id) ON DELETE CASCADE,
    conversation_id INT REFERENCES "Conversation"(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- [Pending, Accepted, Refused]
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_contact_pair UNIQUE (user_id_1, user_id_2),
    CONSTRAINT chk_no_self_contact CHECK (user_id_1 <> user_id_2)
);

-- Create the function to validate user roles
CREATE OR REPLACE FUNCTION validate_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for private conversations
    IF NEW.status = 'private' THEN
        RETURN NEW;
    END IF;
    
    IF (SELECT type FROM "User" WHERE id = NEW.student_id) <> 'student' THEN
        RAISE EXCEPTION 'student_id must refer to a Student';
    END IF;
    IF (SELECT type FROM "User" WHERE id = NEW.teacher_id) <> 'teacher' THEN
        RAISE EXCEPTION 'teacher_id must refer to a Teacher';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for validating user roles
CREATE TRIGGER validate_user_roles_trigger
BEFORE INSERT OR UPDATE ON "Conversation"
FOR EACH ROW EXECUTE FUNCTION validate_user_roles();