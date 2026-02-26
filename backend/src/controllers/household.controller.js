import Household from "../models/Household.js";
import { getWeatherByCity, generateEnergyTip } from "../services/weather.service.js";

export const createHousehold = async (req, res) => {
  try {
    const household = new Household(req.body);
    const saved = await household.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllHouseholds = async (req, res) => {
  try {
    const households = await Household.find();
    res.status(200).json(households);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHouseholdById = async (req, res) => {
  try {
    const household = await Household.findById(req.params.id);
    if (!household) return res.status(404).json({ message: "Household not found" });
    res.status(200).json(household);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHousehold = async (req, res) => {
  try {
    const updated = await Household.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Household not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteHousehold = async (req, res) => {
  try {
    const deleted = await Household.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Household not found" });
    res.status(200).json({ message: "Household deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHouseholdSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { monthlyKwhTarget, monthlyCostTarget, currency } = req.body;

    const updateData = {};
    if (monthlyKwhTarget !== undefined) updateData.monthlyKwhTarget = monthlyKwhTarget;
    if (monthlyCostTarget !== undefined) updateData.monthlyCostTarget = monthlyCostTarget;
    if (currency !== undefined) updateData.currency = currency;

    const updated = await Household.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Household not found" });

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getHouseholdWeather = async (req, res) => {
  try {
    const { id } = req.params;

    const household = await Household.findById(id);
    if (!household) return res.status(404).json({ message: "Household not found" });

    const city = household.city;
    const weather = await getWeatherByCity(city);
    const tip = generateEnergyTip(weather.temperature);

    res.status(200).json({ householdId: id, city, weather, tip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};