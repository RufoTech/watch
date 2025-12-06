// backend/controllers/filterController.js (səndə haradadırsa)
import { Product } from "../model/Product.js";

export const getFilterControllers = async (req, res) => {
  try {
    let filter = {};

    // Frontend-dən gələn query parametrlər:
    const {
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      search,
      sort,
      price, // köhnə "100-500" formatını da dəstəkləmək üçün saxladım
    } = req.query;

    /* ----------------------- KATEQORİYA / SUBCATEGORY / BREND ----------------------- */

    if (category) {
      filter.category = category;
    }

    if (subcategory) {
      filter.subcategory = subcategory;
    }

    if (brand) {
      filter.brand = brand;
    }

    /* ------------------------------ QİYMƏT ARALIĞI ------------------------------ */
    // 1) Yeni struktur: minPrice & maxPrice
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // 2) Köhnə "price=100-500" formatı (istəsən tam silə bilərsən)
    if (price && !minPrice && !maxPrice) {
      const [min, max] = price.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        filter.price = { $gte: min, $lte: max };
      }
    }

    /* -------------------------------- AXTARIŞ (SEARCH) -------------------------------- */
    if (search) {
      const searchRegex = { $regex: search, $options: "i" }; // case-insensitive

      // Mövcud filter-lə birlikdə işləsin deyə $and istifadə edək
      filter.$and = [
        { ...(Object.keys(filter).length ? filter : {}) },
        {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { brand: searchRegex },
            { category: searchRegex },
            { subcategory: searchRegex },
          ],
        },
      ];

      // artıq köhnə root filter obyektini $and-in içinə saldıq, ona görə təmizləyək
      Object.keys(filter).forEach((key) => {
        if (key !== "$and") delete filter[key];
      });
    }

    /* ---------------------------------- SORTING ---------------------------------- */
    let sortOption = {};

    switch (sort) {
      case "price_asc":
        sortOption = { price: 1 };
        break;
      case "price_desc":
        sortOption = { price: -1 };
        break;
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "top_rated":
        sortOption = { ratings: -1 };
        break;
      default:
        sortOption = { createdAt: -1 }; // default: ən yenilər
        break;
    }

    /* ------------------------------ DB- DƏN SORĞU ------------------------------ */
    const products = await Product.find(filter).sort(sortOption);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.error("Filter controller error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server xətası", error: err.message });
  }
};
