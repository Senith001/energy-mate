import Room from "../models/Room.js";

export const createRoom = async (req, res) => {
  try {
    const { householdId } = req.params;
    const room = new Room({ householdId, ...req.body });
    const saved = await room.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRoomsByHousehold = async (req, res) => {
  try {
    const { householdId } = req.params;
    const rooms = await Room.find({ householdId }).sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const updated = await Room.findByIdAndUpdate(roomId, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Room not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const deleted = await Room.findByIdAndDelete(roomId);
    if (!deleted) return res.status(404).json({ message: "Room not found" });
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};