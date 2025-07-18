import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import Message from "../models/message.js"

// Signup a new user
export const signup = async (req, res)=>{
    const { fullName, email, password, bio } = req.body;

    try {
        if (!fullName || !email || !password || !bio){
            return res.json({success: false, message: "Missing Details"})
        }
        const user = await User.findOne({email});

        if(user){
            return res.json({success: false, message: "Account already exists"})
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName, email, password: hashedPassword, bio
        });

        const token = generateToken(newUser._id)

        res.json({success: true, userData: newUser, token, message: "Account created successfully"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Controller to login a user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({email})

        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);

        if (!isPasswordCorrect){
            return res.json({success: false, message: "Invalid credentials"});
        }

        const token = generateToken(userData._id)
        res.json({success: true, userData, token, message: "Login successful"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Controller to check if user is authenticated
export const checkAuth = (req, res)=>{
    res.json({success: true, user: req.user});
}

// Controller to update user profile details
export const updateProfile = async (req, res)=>{
    try {
        const { profilePic, bio, fullName } = req.body;
        
        const userId = req.user._id;

        let updatedUser;

        if(!profilePic){
            updatedUser = await User.findByIdAndUpdate(userId, {bio, fullName}, {new: true})
        } else{
            const upload = await cloudinary.uploader.upload(profilePic);
            
            updatedUser = await User.findByIdAndUpdate(userId, {profilePic: upload.secure_url, bio, fullName}, {new: true})
        }

        res.json({success: true, user: updatedUser})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Controller to permanently delete the existing user and messages
export const deleteUser = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch user to get profilePic info (if needed)
        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Optional: Delete profile picture from Cloudinary
        if (user.profilePic) {
            const publicId = user.profilePic.split("/").pop().split(".")[0]; // crude extract
            await cloudinary.uploader.destroy(publicId).catch(() => {});
        }

        // Delete user's messages
        await Message.deleteMany({ sender: userId });

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.json({ success: true, message: "User and their messages deleted successfully" });
    } catch (error) {
        console.error(error.message);
        res.json({ success: false, message: error.message });
    }
};
