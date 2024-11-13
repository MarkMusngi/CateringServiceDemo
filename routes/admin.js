const express = require('express');
const router = express.Router();
const { getDb } = require('./db');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Route for the Admin dashboard page
router.get('/admin_dashboard', async (req, res) => {
    try {     
        const db = getDb();
        const { name, date, occasion, status, sort } = req.query;
        
        console.log('Query parameters:', { name, date, occasion, status, sort });

        let events;

        let sortOption = { _id: 1 }; // Default sort option by _id ascending
        if (sort === 'date') {
            sortOption = { event_date: 1 };  
        } else if (sort === 'name') {
            sortOption = { 'contact.lastName': 1, 'contact.firstName': 1 };  
        } else if (sort === 'occasion') {
            sortOption = { occasion: 1 };  
        } else if (sort === 'status') {
            sortOption = { status: 1 };  
        } else if (sort === 'id') {
            sortOption = { eventId: 1 };  
        }

        console.log('Sort option:', sortOption);

        // Build the match criteria based on search inputs
        const matchCriteria = {};
        if (name) {
            matchCriteria.$or = [
                { 'contact.firstName': { $regex: name, $options: 'i' } },
                { 'contact.lastName': { $regex: name, $options: 'i' } }
            ];
        }
        if (date) {
            matchCriteria.event_date = { $regex: date, $options: 'i' };
        }
        if (occasion) {
            matchCriteria.occasion = { $regex: occasion, $options: 'i' };
        }
        if (status) {
            matchCriteria.status = status;
        }

        if (Object.keys(matchCriteria).length > 0) {
            // Filter events based on the constructed match criteria
            events = await db.collection('events').aggregate([
                {
                    $lookup: {
                        from: 'contacts',
                        localField: 'contactsId',
                        foreignField: '_id',
                        as: 'contact'
                    }
                },
                {
                    $match: matchCriteria
                },
                {
                    $sort: sortOption // Ensure sortOption is always defined
                }
            ]).toArray();
        } else {
            // Fetch all events if no search query is provided
            events = await db.collection('events').aggregate([
                {
                    $lookup: {
                        from: 'contacts',
                        localField: 'contactsId',
                        foreignField: '_id',
                        as: 'contact'
                    }   
                },
                {
                    $sort: sortOption // Ensure sortOption is always defined
                }
            ]).toArray();
        }      
        // Map events to the desired format
        const formattedEvents = events.map(event => {
            const contact = event.contact[0]; // Since $lookup returns an array, take the first element
            const fullName = contact ? `${contact.lastName || 'N/A'}, ${contact.firstName || 'N/A'}` : 'N/A';
            const eventId = event.eventId;
            const date = event.event_date || 'N/A';
            const occasion = event.occasion || 'N/A';
            const status = event.status || 'N/A';

            return { _id: event._id, eventId, fullName, date, occasion, status };
        });

        res.render('admin_dashboard', { title: 'Admin Dashboard', contacts: formattedEvents, name, date, occasion, status, sort });
    } catch (error) {
        console.error('Error fetching data from database:', error);
        res.status(500).send('Error fetching data from database');
    }
});

// POST route for Admin logout
router.post('/admin_logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Error logging out');
        } else {
            res.redirect('/admin/login'); // Redirect to the admin login page after logout
        }
    });
});

// Route to render the add-client page
router.get('/admin/add-client', (req, res) => {
    res.render('admin_add', { title: 'Create New Client' });
});

// POST route to handle the form submission and add the client to the database
router.post('/admin/add-client', async (req, res) => {
    const { firstName, lastName, email, phone, facebook } = req.body;

    if (!firstName || !lastName || !email || !phone) {
        return res.status(400).send('First name, last name, email, and phone are required.');
    }

    try {
        const db = getDb();
        let contactsId = null; // Initialize contactsId to null

        // Check if email already exists in the contacts collection
        const existingContact = await db.collection('contacts').findOne({ email });
        if (existingContact) {
            console.log('Email already exists in database:', email);
            contactsId = existingContact._id;  // Set contactsId from the existing contact
        } else {
            // If no existing contact, insert a new one
            const contactResult = await db.collection('contacts').insertOne({
                firstName,
                lastName,
                email,
                phone,
                facebook,
                timestamp: new Date(),
            });
            contactsId = contactResult.insertedId; // Use the newly inserted contact's _id
        }

        // Insert into events collection with default values
        const eventResult = await db.collection('events').insertOne({
            eventId: uuidv4(),
            contactsId: contactsId,
            time_start: 'N/A',
            time_end: 'N/A',
            table_linen: 'N/A',
            table_napkin: 'N/A',
            welcome_food1: 'N/A',
            welcome_food2: 'N/A',
            welcome_food3: 'N/A',
            welcome_food4: 'N/A',
            appetizer1: 'N/A',
            appetizer2: 'N/A',
            appetizer3: 'N/A',
            appetizer4: 'N/A',
            main_course1: 'N/A',
            main_course2: 'N/A',
            main_course3: 'N/A',
            main_course4: 'N/A',
            main_course5: 'N/A',
            main_course6: 'N/A',
            main_course7: 'N/A',
            dessert1: 'N/A',
            dessert2: 'N/A',
            dessert3: 'N/A',
            dessert4: 'N/A',
            drink1: 'N/A',
            drink2: 'N/A',
            drink3: 'N/A',
            drink4: 'N/A',
            number_pax: 'N/A',
            others: 'N/A',
            downpayment: 'N/A',
            balance: 'N/A',
            venue: 'N/A',
            address: 'N/A',
            occasion: 'N/A',
            event_date: 'N/A',
            status: 'Pending',            
        });

        res.render('admin_add', { title: 'Create New Client', success: true }); // Render the same page with success message
    } catch (dbError) {
        console.error('Error inserting/updating data into the database:', dbError);
        return res.status(500).send('Error inserting/updating data into the database');
    }
});

// Endpoint to handle client search
router.get('/admin/search-client', async (req, res) => {
    const query = req.query.q; // Get search query from request parameters

    try {
        const db = getDb(); // Retrieve the MongoDB database instance
        const collection = db.collection('contacts');

        // Find clients matching the search query
        const clients = await collection.find({
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } }
            ]
        }).toArray();

        res.json(clients); // Send JSON response with matching clients
    } catch (error) {
        console.error('Error searching clients:', error);
        res.status(500).json({ error: 'Error searching clients' });
    }
});

// Route to render the edit-client page
router.get('/admin/edit-event/:id', async (req, res) => {
    try {
        const db = getDb();
        const eventId = req.params.id; // Renamed to eventId for clarity
        const objectId = new ObjectId(eventId);

        // Find the event by ID
        const event = await db.collection('events').findOne({ _id: objectId });
        if (!event) {
            return res.status(404).send('Event not found');
        }

        // Find the corresponding contact by event's contactId (assuming event has a contactId field)
        const contact = await db.collection('contacts').findOne({ _id: new ObjectId(event.contactsId) });
        if (!contact) {
            return res.status(404).send('Contact not found');
        }

        // Render the admin_edit page with the event's and contact's information
        res.render('admin_edit', { title: 'Edit Client', event, contact });
    } catch (error) {
        console.error('Error fetching event data from database:', error);
        res.status(500).send('Error fetching event data from database');
    }
});

// POST route to handle the form submission and update the event and contact in the database
router.post('/admin/edit-event/:id', async (req, res) => {
    const eventId = req.params.id;
    const { action } = req.body; // Destructure action from req.body

    const {
        firstName, lastName, email, phone, facebook,
        venue, time_start, time_end, table_linen, table_napkin,
        welcome_food1, welcome_food2, welcome_food3, welcome_food4,
        appetizer1, appetizer2, appetizer3, appetizer4,
        main_course1, main_course2, main_course3, main_course4,
        main_course5, main_course6, main_course7,
        dessert1, dessert2, dessert3, dessert4,
        drink1, drink2, drink3, drink4,
        number_pax, others, downpayment, balance, address, occasion, event_date, status
    } = req.body;

    try {
        const db = getDb(); // Assuming getDb() returns a MongoDB connection
        const eventObjectId = new ObjectId(eventId);

        const event = await db.collection('events').findOne({ _id: eventObjectId });
        if (!event) {
            return res.status(404).send('Event not found');
        }

        const contactId = event.contactsId; // Adjust according to your event schema
        if (!contactId) {
            return res.status(404).send('Contact ID not found in the event');
        }
        const contactObjectId = new ObjectId(contactId);

        // Build the update object for event
        const updateEventFields = {};
        if (venue) updateEventFields.venue = venue;
        if (time_start) updateEventFields.time_start = time_start;
        if (time_end) updateEventFields.time_end = time_end;
        if (table_linen) updateEventFields.table_linen = table_linen;
        if (table_napkin) updateEventFields.table_napkin = table_napkin;
        if (welcome_food1) updateEventFields.welcome_food1 = welcome_food1;
        if (welcome_food2) updateEventFields.welcome_food2 = welcome_food2;
        if (welcome_food3) updateEventFields.welcome_food3 = welcome_food3;
        if (welcome_food4) updateEventFields.welcome_food4 = welcome_food4;
        if (appetizer1) updateEventFields.appetizer1 = appetizer1;
        if (appetizer2) updateEventFields.appetizer2 = appetizer2;
        if (appetizer3) updateEventFields.appetizer3 = appetizer3;
        if (appetizer4) updateEventFields.appetizer4 = appetizer4;
        if (main_course1) updateEventFields.main_course1 = main_course1;
        if (main_course2) updateEventFields.main_course2 = main_course2;
        if (main_course3) updateEventFields.main_course3 = main_course3;
        if (main_course4) updateEventFields.main_course4 = main_course4;
        if (main_course5) updateEventFields.main_course5 = main_course5;
        if (main_course6) updateEventFields.main_course6 = main_course6;
        if (main_course7) updateEventFields.main_course7 = main_course7;
        if (dessert1) updateEventFields.dessert1 = dessert1;
        if (dessert2) updateEventFields.dessert2 = dessert2;
        if (dessert3) updateEventFields.dessert3 = dessert3;
        if (dessert4) updateEventFields.dessert4 = dessert4;
        if (drink1) updateEventFields.drink1 = drink1;
        if (drink2) updateEventFields.drink2 = drink2;
        if (drink3) updateEventFields.drink3 = drink3;
        if (drink4) updateEventFields.drink4 = drink4;
        if (number_pax) updateEventFields.number_pax = number_pax;
        if (others) updateEventFields.others = others;
        if (downpayment) updateEventFields.downpayment = downpayment;
        if (balance) updateEventFields.balance = balance;
        if (address) updateEventFields.address = address;
        if (occasion) updateEventFields.occasion = occasion;
        if (event_date) updateEventFields.event_date = event_date;
        if (status) updateEventFields.status = status;

        // Build the update object for contact
        const updateContactFields = {};
        if (firstName) updateContactFields.firstName = firstName;
        if (lastName) updateContactFields.lastName = lastName;
        if (email) updateContactFields.email = email;
        if (phone) updateContactFields.phone = phone;
        if (facebook) updateContactFields.facebook = facebook;

        // Update the event in the database
        const eventResult = await db.collection('events').updateOne(
            { _id: eventObjectId },
            { $set: updateEventFields }
        );

        // Update the contact in the database
        const contactResult = await db.collection('contacts').updateOne(
            { _id: contactObjectId },
            { $set: updateContactFields }
        );

        // Send completion email if status is confirmed
        if (action === 'sendConfirmationEmail' && status === 'Confirmed') {
            // Create a transporter using Gmail SMTP
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'mailerdeflorence@gmail.com', // Your Gmail email address
                    pass: 'nayf cfiv cpff bmxs'   // Your Gmail password
                }
            });

            // Email options
            const mailOptions = {
                from: 'noreply@example.com',
                to: email,
                subject: 'Event Confirmation',
                text: `Dear ${firstName} ${lastName},\n\nYour event has been confirmed.\n\nEvent Details:\n- Venue: ${venue}\n- Address: ${address}\n- Occasion: ${occasion}\n- Date: ${event_date}\n- Time Start: ${time_start}\n- Time End: ${time_end}\n- Table Linen: ${table_linen}\n- Table Napkin: ${table_napkin}\n- Welcome Food 1: ${welcome_food1}\n- Welcome Food 2: ${welcome_food2}\n- Welcome Food 3: ${welcome_food3}\n- Welcome Food 4: ${welcome_food4}\n- Appetizer 1: ${appetizer1}\n- Appetizer 2: ${appetizer2}\n- Appetizer 3: ${appetizer3}\n- Appetizer 4: ${appetizer4}\n- Main Course 1: ${main_course1}\n- Main Course 2: ${main_course2}\n- Main Course 3: ${main_course3}\n- Main Course 4: ${main_course4}\n- Main Course 5: ${main_course5}\n- Main Course 6: ${main_course6}\n- Main Course 7: ${main_course7}\n- Dessert 1: ${dessert1}\n- Dessert 2: ${dessert2}\n- Dessert 3: ${dessert3}\n- Dessert 4: ${dessert4}\n- Drink 1: ${drink1}\n- Drink 2: ${drink2}\n- Drink 3: ${drink3}\n- Drink 4: ${drink4}\n- Number of Pax: ${number_pax}\n- Others: ${others}\n- Downpayment: ${downpayment}\n- Balance: ${balance}\n Reference Number: ${eventId} \nThank you for choosing our services.\n\nBest regards,\nDe Florence Catering Services`
            };

            // Send email
            await transporter.sendMail(mailOptions);
            console.log('Completion email sent to:', email);
        }

        res.redirect('/admin_dashboard'); // Redirect to the admin dashboard
    } catch (error) {
        console.error('Error updating event or contact in the database:', error);
        res.status(500).send('Error updating event or contact in the database');
    }
});

// Route to delete an event by ID
router.get('/admin/delete-event/:id', async (req, res) => {
    try { 
        const db = getDb();
        const eventId = req.params.id; // Renamed to eventId for clarity

        // Delete the event by ID
        const result = await db.collection('events').deleteOne({ _id: new ObjectId(eventId) });

        if (result.deletedCount === 0) {
            return res.status(404).send('Event not found');
        }

        res.redirect('/admin_dashboard'); // Redirect to the admin page after deletion
    } catch (error) {
        console.error('Error deleting event from database:', error);
        res.status(500).send('Error deleting event from database');
    }
});

router.get('/client-profiles', async (req, res) => {
    try {
        // Get the database instance
        const db = getDb(); // Assuming you have a function getDb() to get the database connection

        // Fetch all client profiles directly from the 'clients' collection
        const clients = await db.collection('contacts').find().toArray();

        clients.forEach(client => {
            client.fullName = `${client.firstName} ${client.lastName}`;
        });
                
        // Render the 'admin_add' page with the client data
        res.render('client_profiles', { 
            title: 'Client Profiles',
            clients: clients
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).send('Server Error');
    }
});
// Route to render the edit-client page
router.get('/admin/edit-client/:id', async (req, res) => {
    try {
        const db = getDb();
        const clientId = req.params.id; // Use clientId for clarity
        const objectId = new ObjectId(clientId);

        // Find the client by ID
        const client = await db.collection('contacts').findOne({ _id: objectId });
        if (!client) {
            return res.status(404).send('Client not found');
        }

        // Render the edit_client page with the client's information
        res.render('edit_client', { title: 'Edit Client', client });
    } catch (error) {
        console.error('Error fetching client data from database:', error);
        res.status(500).send('Error fetching client data from database');
    }
});

// Route to handle updating the client data
router.post('/admin/edit-client/:id', async (req, res) => {
    try {
        const db = getDb();
        const clientId = req.params.id; // Get the client ID from the URL
        const objectId = new ObjectId(clientId); // Convert to MongoDB ObjectId

        // Extract updated client details from the request body
        const { firstName, lastName, email, phone } = req.body;

        // Perform the update operation
        const updateResult = await db.collection('contacts').updateOne(
            { _id: objectId },
            {
                $set: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    updatedAt: new Date(),
                },
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(404).send('Client not found or data not modified');
        }

        // Redirect back to the client profiles page after a successful update
        res.redirect('/client-profiles');
    } catch (error) {
        console.error('Error updating client data:', error);
        res.status(500).send('Error updating client data');
    }
});

// Route to delete a client by ID
router.get('/admin/delete-client/:id', async (req, res) => {
    try {
        const db = getDb();
        const clientId = req.params.id; // Renamed to clientId for clarity

        // Delete the client by ID
        const result = await db.collection('contacts').deleteOne({ _id: new ObjectId(clientId) });

        if (result.deletedCount === 0) {
            return res.status(404).send('Client not found');
        }

        // Redirect to the client profiles page after deletion
        res.redirect('/client-profiles');
    } catch (error) {
        console.error('Error deleting client from database:', error);
        res.status(500).send('Error deleting client from database');
    }
});

module.exports = router;
