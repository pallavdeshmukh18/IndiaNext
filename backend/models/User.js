const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: function passwordRequired() {
                return this.authProvider === "local";
            }
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        },
        avatar: {
            type: String,
            default: ""
        },
        gmailEmail: {
            type: String,
            default: null,
        },
        gmailTokens: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
    if (!this.password || !this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
    if (!this.password) {
        return false;
    }

    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
