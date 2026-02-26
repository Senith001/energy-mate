import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema({
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: "Household", required: true },
    summary: String,
    
    tips: [{
        title: String,
        description: String,
        learnMore: String
    }],
    
    strategies: [{
        title: String,
        summary: String,
        details: [String],
        problem: String,
        strategy: String,
        controls: [String]
    }],
    
    predictionTable: [{
        month: String,
        currentConsumption: Number,
        predictedConsumption: Number
    }],
    predictionInsights: [{
        title: String,
        description: String
    }],
    source: { type: String, enum: ["ai_generated", "admin_manual"], default: "ai_generated" },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Recommendation", recommendationSchema);