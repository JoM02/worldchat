const ContactService = require('../services/contactService');

class ContactController {

    async modifyContactStatus(req, res) {
        const { userId1, userId2, status } = req.params;
    
        try {
            console.log(`Modification du statut du contact entre ${userId1} et ${userId2} vers ${status}`);
    
            // Appel à la méthode du service pour mettre à jour le statut
            const updatedContact = await ContactService.modifyContactStatus(userId1, userId2, status);
    
            if (!updatedContact) {
                return res.status(404).json({ message: 'Contact non trouvé' });
            }
    
            res.status(200).json(updatedContact);
        } catch (error) {
            console.error('Erreur lors de la modification du statut du contact:', error);
            res.status(500).json({ message: 'Erreur serveur lors de la modification du statut' });
        }
    }

    async createContact(req, res) {
        try {
            const contact = await ContactService.createContact(req.body);
            res.status(201).json(contact);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async getAllContacts(req, res) {
        try {
            const contacts = await ContactService.getAllContacts();
            res.status(200).json(contacts);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getContactByUserIds(req, res) {
        try {
            const { userId1, userId2 } = req.params;
            const contact = await ContactService.getContactByUserIds(userId1, userId2);
            if (!contact) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            res.status(200).json(contact);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async deleteContact(req, res) {
        try {
            const { userId1, userId2 } = req.params;
            const result = await ContactService.deleteContact(userId1, userId2);
            if (result === 0) {
                return res.status(404).json({ error: 'Contact not found' });
            }
            res.status(200).json({ message: 'Contact deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new ContactController();