import { Router } from "express";

const router = Router();

const DATA: Record<string, string[]> = {
  Toyota: ["Corolla", "Yaris", "RAV4", "Hilux", "Prius"],
  Volkswagen: ["Gol", "Golf", "Polo", "Tiguan", "T-Cross"],
  Chevrolet: ["Spark", "Onix", "Sail", "Tracker", "Equinox"],
  Ford: ["Fiesta", "Focus", "Ranger", "EcoSport", "Bronco"],
  Nissan: ["March", "Versa", "Sentra", "Qashqai", "X-Trail"],
  Hyundai: ["i10", "i20", "Elantra", "Creta", "Tucson"],
  Kia: ["Rio", "Cerato", "Picanto", "Sportage", "Seltos"],
};

const BRANDS = Object.keys(DATA).sort();

router.get("/autos/brands", (_req, res) => {
  res.json({ items: BRANDS });
});

router.get("/autos/models", (req, res) => {
  const brand = req.query.brand as string | undefined;
  if (!brand || !DATA[brand]) return res.json({ items: [] });
  res.json({ items: DATA[brand] });
});

router.get("/autos/meta", (_req, res) => {
  res.json({
    transmissions: ["MANUAL", "AUTOMATIC"],
    fuels: ["GASOLINE", "DIESEL", "EV", "HYBRID"],
    years: { min: 1990, max: new Date().getFullYear() },
  });
});

export default router;
