import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
import mongodb from 'mongodb'
const { ObjectId } = mongodb

export const userService = {
    add,            // Create (Signup)
    getById,        // Read (Profile page)
    update,         // Update (Edit profile)
    updateUsers,    // Update all users
    remove,         // Delete (remove user)
    query,          // List (of users)
    getByUsername   // Used for Login
}

async function query(filterBy = {}) {
    const criteria = _buildCriteria(filterBy)
    try {
        const collection = await dbService.getCollection('user')
        var users = await collection.find(criteria).toArray()
        users = users.map(user => {
            delete user.password
            user.createdAt = ObjectId(user._id).getTimestamp()
            return user
        })
        return users
    } catch (err) {
        logger.error('cannot find users', err)
        throw err
    }
}

async function getById(userId) {
    try {
        const collection = await dbService.getCollection('user')
        const user = await collection.findOne({ _id: ObjectId(userId) })
        delete user.password

        user.givenReviews = await reviewService.query({ byUserId: ObjectId(user._id) })
        user.givenReviews = user.givenReviews.map(review => {
            delete review.byUser
            return review
        })

        return user
    } catch (err) {
        logger.error(`while finding user by id: ${userId}`, err)
        throw err
    }
}
async function getByUsername(username) {
    try {
        const collection = await dbService.getCollection('user')
        const user = await collection.findOne({ username })
        return user
    } catch (err) {
        logger.error(`while finding user by username: ${username}`, err)
        throw err
    }
}

async function remove(userId) {
    try {
        const collection = await dbService.getCollection('user')
        await collection.deleteOne({ _id: ObjectId(userId) })
    } catch (err) {
        logger.error(`cannot remove user ${userId}`, err)
        throw err
    }
}

async function update(user) {
    try {
        // peek only updatable properties
        const userToSave = {
            _id: ObjectId(user._id), // needed for the returnd obj
            shifts: user.shifts,
        }
        console.log('userToSave:', userToSave)
        const collection = await dbService.getCollection('user')
        await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
        return userToSave
    } catch (err) {
        logger.error(`cannot update user ${user._id}`, err)
        throw err
    }
}

async function updateUsers(users) {
    try {
        const collection = await dbService.getCollection('user')
        const updatePromises = users.map(async user => {
            const userToSave = {
                _id: ObjectId(user._id), // Ensure the ID is in the correct format for MongoDB
                shifts: user.shifts,
            };
            await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
            return userToSave
        });

        // Wait for all updates to complete
        const updatedUsers = await Promise.all(updatePromises)
        console.log('updatedUsers:', updatedUsers)
        return updatedUsers
    } catch (err) {
        logger.error(`cannot update users`, err)
        throw err
    }
}


async function add(user) {
    try {
        // peek only updatable fields!
        const userToAdd = {
            username: user.username,
            password: user.password,
            imgUrl: user.imgUrl
        }
        const collection = await dbService.getCollection('user')
        await collection.insertOne(userToAdd)
        return userToAdd
    } catch (err) {
        logger.error('cannot add user', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.txt) {
        const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
        criteria.$or = [
            {
                email: txtCriteria
            },
            {
                fullname: txtCriteria
            }
        ]
    }
    return criteria
}




