// src/pages/Categories.jsx
import React, { useMemo } from "react";
import Container from "../components/ui/Container";
import { useGetProductsQuery } from "../redux/api/productsApi";
import { useGetCategoriesQuery } from "../redux/api/categoryApi"; // 🔥 Category API
import { Link } from "react-router-dom";

// Tək bir kategoriya elementinin komponenti
const CategoryCard = ({ name, productCount, imageUrl, imageAlt, subcategories = [] }) => {
  const categorySlug = encodeURIComponent(name);

  return (
    <div
      className="bg-transparent rounded-xl transition-all duration-300 flex flex-col items-center justify-between p-0 cursor-pointer w-full max-w-[200px] mx-auto group focus:outline-none"
      style={{ minHeight: "200px" }}
    >
      {/* 🔗 BÜTÜN kart (şəkil + başlıq) → yalnız CATEGORY: /catalog/:category */}
      <Link
        to={`/catalog/${categorySlug}`}
        className="w-full flex flex-col items-center"
      >
        {/* Məhsul Şəkili sahəsi */}
        <div className="w-full aspect-square flex justify-center items-center bg-white">
          <img
            src={imageUrl}
            alt={imageAlt}
            className="object-contain w-36 h-36 transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://placehold.co/150x150/6B7280/ffffff?text=Image+Error";
            }}
          />
        </div>

        {/* Məhsul Məlumatı */}
        <div className="text-center mt-2 sm:mt-4 w-full">
          <h3
            className="font-bold text-gray-800 line-clamp-2"
            style={{ fontSize: "19px" }}
          >
            {name}
          </h3>
          <p
            className={`text-sm mt-1 ${
              productCount > 0 ? "text-gray-600" : "text-gray-400"
            }`}
          >
            {productCount} product{productCount !== 1 ? "s" : ""}
          </p>
        </div>
      </Link>

      {/* 🔻 Alt kateqoriyalar (CLICKABLE) → /catalog/:category/:subcategory */}
      {subcategories.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1 px-1 pb-2">
          {subcategories.slice(0, 3).map((sub) => {
            const subSlug = encodeURIComponent(sub.name);
            return (
              <Link
                key={sub._id || sub.name}
                to={`/catalog/${categorySlug}/${subSlug}`}
                className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
                onClick={(e) => e.stopPropagation()} // parent link-i trigger eləməsin
              >
                {sub.name} ({sub.productCount})
              </Link>
            );
          })}

          {subcategories.length > 3 && (
            <span className="text-xs text-gray-400">
              +{subcategories.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Əsas Kateqoriya Bölməsi Komponenti
export default function Categories() {
  // Məhsullar
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
  } = useGetProductsQuery();

  // Kateqoriyalar (backend Category modelindən)
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = useGetCategoriesQuery();

  const categories = useMemo(() => {
    const products = productsData?.products || [];

    // Category API-dən gələn massiv:
    // {_id, name, image: {public_id, url}, subcategories: [ { _id, name, ... }, ... ]}
    const apiCategories =
      categoriesData?.categories ||
      categoriesData?.data ||
      categoriesData ||
      [];

    // Əgər backend-dən kateqoriya gəlmirsə → fallback: məhsullardan çıxar
    if (!Array.isArray(apiCategories) || apiCategories.length === 0) {
      const categoryMapFromProducts = products.reduce((acc, product) => {
        const category = product.category;
        if (!category) return acc;

        if (!acc[category]) {
          acc[category] = {
            name: category,
            productCount: 0,
            imageUrl: "",
            imageAlt: `${category} kateqoriyası`,
            subcategories: [],
          };
        }

        acc[category].productCount += 1;

        const url =
          (product.images &&
            product.images.length > 0 &&
            product.images[0]?.url) ||
          product.image ||
          "";
        if (!acc[category].imageUrl && url) {
          acc[category].imageUrl = url;
        }

        return acc;
      }, {});

      return Object.values(categoryMapFromProducts).map((cat) => ({
        ...cat,
        imageUrl:
          cat.imageUrl ||
          "https://placehold.co/150x150/6B7280/ffffff?text=No+Image",
      }));
    }

    // 🔥 Əsas: Category collection + subcategories array-dən istifadə
    const result = apiCategories.map((cat) => {
      // Bu kateqoriyaya aid məhsullar
      const relatedProducts = products.filter(
        (p) =>
          p.category === cat.name ||
          p.categoryId === cat._id // ehtiyat üçün
      );

      // Şəkil:
      let imageUrl =
        cat.image?.url ||
        cat.imageUrl ||
        "";

      if (!imageUrl) {
        for (const p of relatedProducts) {
          const url =
            (p.images && p.images.length > 0 && p.images[0]?.url) ||
            p.image ||
            "";
          if (url) {
            imageUrl = url;
            break;
          }
        }
      }

      // Alt kateqoriyalar:
      const subcatsArray = Array.isArray(cat.subcategories)
        ? cat.subcategories
        : [];

      const subcategories = subcatsArray.map((sub) => {
        // Hər subcategory üçün məhsul sayını Product.subcategory-dən hesablayırıq
        const subProducts = products.filter(
          (p) =>
            p.category === cat.name &&
            p.subcategory === sub.name
        );

        return {
          _id: sub._id,
          name: sub.name,
          productCount: subProducts.length,
        };
      });

      return {
        _id: cat._id,
        name: cat.name,
        productCount: relatedProducts.length,
        imageUrl:
          imageUrl ||
          "https://placehold.co/150x150/6B7280/ffffff?text=No+Image",
        imageAlt: `${cat.name} kateqoriyası`,
        subcategories,
      };
    });

    return result;
  }, [productsData, categoriesData]);

  const isLoading = isProductsLoading || isCategoriesLoading;
  const isError = isProductsError || isCategoriesError;

  if (isLoading) {
    return (
      <Container>
        <div className="w-full py-8 sm:py-12 flex justify-center items-center">
          <span className="text-gray-600 text-sm sm:text-base">
            Yüklənir...
          </span>
        </div>
      </Container>
    );
  }

  if (isError || !categories.length) {
    return (
      <Container>
        <div className="w-full py-8 sm:py-12 flex justify-center items-center">
          <span className="text-gray-600 text-sm sm:text-base">
            Kateqoriya tapılmadı.
          </span>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="w-full py-8 sm:py-12">
        {/* Başlıq */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-5 tracking-tight text-center sm:text-left">
          Popular Categories
        </h2>

        {/* Categories Grid */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {categories.map((category) => (
            <div
              key={category._id || category.name}
              className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] md:w-[calc(25%-15px)] lg:w-[calc(20%-24px)] xl:w-[calc(16.666%-20px)]"
              style={{ minWidth: "140px", maxWidth: "200px" }}
            >
              <CategoryCard
                name={category.name}
                productCount={category.productCount}
                imageUrl={category.imageUrl}
                imageAlt={category.imageAlt}
                subcategories={category.subcategories} // 🔥 buradan Category.subcategories gəlir
              />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
