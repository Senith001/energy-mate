import Appliance from "../models/Appliance.js";

export const createAppliance = async (req, res) => {
  try {
    const { householdId } = req.params;
    const appliance = new Appliance({ householdId, ...req.body });
    const saved = await appliance.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAppliancesByHousehold = async (req, res) => {
  try {
    const { householdId } = req.params;
    const list = await Appliance.find({ householdId }).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApplianceById = async (req, res) => {
  try {
    const { applianceId } = req.params;
    const item = await Appliance.findById(applianceId);
    if (!item) return res.status(404).json({ message: "Appliance not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAppliance = async (req, res) => {
  try {
    const { applianceId } = req.params;
    const updated = await Appliance.findByIdAndUpdate(applianceId, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Appliance not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAppliance = async (req, res) => {
  try {
    const { applianceId } = req.params;
    const deleted = await Appliance.findByIdAndDelete(applianceId);
    if (!deleted) return res.status(404).json({ message: "Appliance not found" });
    res.status(200).json({ message: "Appliance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};