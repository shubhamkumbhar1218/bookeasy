// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "../styles/CustomerDashboard.css";

// import {
//   Search,
//   MapPin,
//   Store,
//   Phone,
//   CalendarDays,
//   X,
//   Star,
// } from "lucide-react";

// const API =
//   import.meta.env.VITE_API_URL ||
//   "http://localhost:5000/api";

// function CustomerDashboard() {
//   const navigate = useNavigate();

//   const [search, setSearch] = useState("");
//   const [category, setCategory] = useState("all");

//   const [businesses, setBusinesses] = useState([]);

//   const [loading, setLoading] = useState(false);
//   const [searched, setSearched] = useState(false);
//   const [error, setError] = useState("");

//   const categories = [
//     {
//       value: "all",
//       label: "All Categories",
//     },
//     {
//       value: "salon",
//       label: "Salon",
//     },
//     {
//       value: "barber",
//       label: "Barber",
//     },
//     {
//       value: "tutor",
//       label: "Tutor",
//     },
//     {
//       value: "gym",
//       label: "Gym",
//     },
//     {
//       value: "hospital",
//       label: "Hospital",
//     },
//     {
//       value: "repair shop",
//       label: "Repair Shop",
//     },
//     {
//       value: "other",
//       label: "Other",
//     },
//   ];

//   // ======================================================
//   // SEARCH BUSINESSES
//   // ======================================================

//   const searchBusinesses = async () => {
//     try {
//       setLoading(true);
//       setError("");
//       setSearched(true);

//       const params = new URLSearchParams();

//       if (search.trim()) {
//         params.append(
//           "search",
//           search.trim()
//         );
//       }

//       if (category !== "all") {
//         params.append(
//           "category",
//           category
//         );
//       }

//       const response = await fetch(
//         `${API}/business/search?${params.toString()}`
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.message ||
//             "Failed to search businesses"
//         );
//       }

//       setBusinesses(
//         data.businesses || []
//       );
//     } catch (error) {
//       console.log(error);

//       setError(
//         error.message ||
//           "Something went wrong"
//       );

//       setBusinesses([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ======================================================
//   // CLEAR SEARCH
//   // ======================================================

//   const clearSearch = () => {
//     setSearch("");
//     setCategory("all");
//     setBusinesses([]);
//     setSearched(false);
//     setError("");
//   };

//   // ======================================================
//   // CATEGORY NAME
//   // ======================================================

//   const getCategoryName = (type) => {
//     const category = categories.find(
//       (item) => item.value === type
//     );

//     return category
//       ? category.label
//       : "Other";
//   };

//   // ======================================================
//   // RENDER STARS
//   // ======================================================

//   const renderStars = (rating) => {
//     return (
//       <div className="service-stars">
//         {[1, 2, 3, 4, 5].map(
//           (star) => (
//             <Star
//               key={star}
//               size={15}
//               fill={
//                 star <=
//                 Math.round(rating)
//                   ? "currentColor"
//                   : "none"
//               }
//             />
//           )
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="customer-page">

//       {/* ========================= */}
//       {/* HEADER */}
//       {/* ========================= */}

//       <header className="customer-header">

//         <div className="customer-brand">

//           <div className="customer-brand-icon">
//             <Store size={22} />
//           </div>

//           <div>
//             <h1>BookEasy</h1>

//             <span>
//               Find & Book Local Services
//             </span>
//           </div>

//         </div>

//       </header>

//       {/* ========================= */}
//       {/* HERO */}
//       {/* ========================= */}

//       <main className="customer-main">

//         <section className="customer-hero">

//           <p className="eyebrow">
//             FIND LOCAL BUSINESSES
//           </p>

//           <h2>
//             Find a business near you
//           </h2>

//           <p className="customer-subtitle">
//             Search businesses by name,
//             location, or service and
//             compare ratings before booking.
//           </p>

//           {/* ========================= */}
//           {/* SEARCH BOX */}
//           {/* ========================= */}

//           <div className="customer-search-box">

//             <div className="search-field">

//               <Search size={20} />

//               <input
//                 type="text"
//                 placeholder="Search business, location or service..."
//                 value={search}
//                 onChange={(e) =>
//                   setSearch(
//                     e.target.value
//                   )
//                 }
//                 onKeyDown={(e) => {
//                   if (
//                     e.key === "Enter"
//                   ) {
//                     searchBusinesses();
//                   }
//                 }}
//               />

//             </div>

//             <div className="search-field category-select-field">

//   <Store size={20} />

//   <select
//     className="category-select"
//     value={category}
//     onChange={(e) =>
//       setCategory(e.target.value)
//     }
//   >
//     {categories.map((item) => (
//       <option
//         key={item.value}
//         value={item.value}
//       >
//         {item.label}
//       </option>
//     ))}
//   </select>

// </div>

//             <button
//               className="primary customer-search-button"
//               type="button"
//               onClick={
//                 searchBusinesses
//               }
//               disabled={loading}
//             >
//               <Search size={18} />

//               {loading
//                 ? "Searching..."
//                 : "Search"}
//             </button>

//           </div>

//         </section>

//         {/* ========================= */}
//         {/* ERROR */}
//         {/* ========================= */}

//         {error && (
//           <div className="error customer-error">
//             {error}
//           </div>
//         )}

//         {/* ========================= */}
//         {/* RESULTS */}
//         {/* ========================= */}

//         <section className="customer-results">

//           <div className="customer-results-header">

//             <div>

//               <p className="eyebrow">
//                 BUSINESSES
//               </p>

//               <h2>
//                 {searched
//                   ? `${businesses.length} businesses found`
//                   : "Explore businesses"}
//               </h2>

//             </div>

//             {searched && (
//               <button
//                 className="outline"
//                 type="button"
//                 onClick={
//                   clearSearch
//                 }
//               >
//                 <X size={17} />

//                 Clear
//               </button>
//             )}

//           </div>

//           {/* ========================= */}
//           {/* LOADING */}
//           {/* ========================= */}

//           {loading && (
//             <div className="customer-empty">

//               <p>
//                 Searching for
//                 businesses...
//               </p>

//             </div>
//           )}

//           {/* ========================= */}
//           {/* NO RESULTS */}
//           {/* ========================= */}

//           {!loading &&
//             searched &&
//             businesses.length === 0 && (
//               <div className="customer-empty">

//                 <Store size={40} />

//                 <h3>
//                   No businesses found
//                 </h3>

//                 <p>
//                   Try another business
//                   name, location,
//                   service, or category.
//                 </p>

//               </div>
//             )}

//           {/* ========================= */}
//           {/* INITIAL STATE */}
//           {/* ========================= */}

//           {!loading &&
//             !searched && (
//               <div className="customer-empty">

//                 <Search size={40} />

//                 <h3>
//                   Search for a business
//                 </h3>

//                 <p>
//                   Search by business name,
//                   location, or service
//                   and choose a category.
//                 </p>

//               </div>
//             )}

//           {/* ========================= */}
//           {/* BUSINESS CARDS */}
//           {/* ========================= */}

//           {!loading &&
//             businesses.length > 0 && (
//               <div className="business-results-grid">

//                 {businesses.map(
//                   (business) => (
//                     <div
//                       className="business-result-card"
//                       key={
//                         business._id
//                       }
//                     >

//                       {/* BUSINESS TOP */}

//                       <div className="business-card-top">

//                         <div className="business-icon">
//                           <Store
//                             size={25}
//                           />
//                         </div>

//                         <span className="business-category">
//                           {getCategoryName(
//                             business.businessType
//                           )}
//                         </span>

//                       </div>

//                       {/* BUSINESS NAME */}

//                       <h3>
//   {business.businessName}
// </h3>

// {/* BUSINESS OVERALL RATING */}

// <div className="business-overall-rating">

//   {business.totalReviews > 0 ? (
//     <>
//       <div className="business-rating-stars">
//         {[1, 2, 3, 4, 5].map(
//           (star) => (
//             <Star
//               key={star}
//               size={17}
//               fill={
//                 star <=
//                 Math.round(
//                   business.averageRating
//                 )
//                   ? "currentColor"
//                   : "none"
//               }
//             />
//           )
//         )}
//       </div>

//       <strong>
//         {business.averageRating}
//       </strong>

//       <span>
//         {business.totalReviews} review
//         {business.totalReviews !== 1
//           ? "s"
//           : ""}
//       </span>
//     </>
//   ) : (
//     <div className="business-no-rating">

//       <Star size={17} />

//       <span>
//         No reviews yet
//       </span>

//     </div>
//   )}

// </div>

// <div className="business-info">

//                         {business.address && (
//                           <div>

//                             <MapPin
//                               size={17}
//                             />

//                             <span>
//                               {
//                                 business.address
//                               }
//                             </span>

//                           </div>
//                         )}

//                         {business.phone && (
//                           <div>

//                             <Phone
//                               size={17}
//                             />

//                             <span>
//                               {
//                                 business.phone
//                               }
//                             </span>

//                           </div>
//                         )}

//                       </div>

//                       {/* ========================= */}
//                       {/* SERVICES */}
//                       {/* ========================= */}

//                       {business.services &&
//                         business.services
//                           .length > 0 && (
//                           <div className="business-services">

//                             <div className="services-title">
//                               Services
//                             </div>

//                             {business.services.map(
//                               (service) => (
//                                 <div
//                                   className="service-result-card"
//                                   key={
//                                     service._id
//                                   }
//                                 >

//                                   <div className="service-result-main">

//                                     <div>
//                                       <h4>
//                                         {
//                                           service.name
//                                         }
//                                       </h4>

//                                       {service.description && (
//                                         <p>
//                                           {
//                                             service.description
//                                           }
//                                         </p>
//                                       )}
//                                     </div>

//                                     <strong className="service-price">
//                                       ₹
//                                       {
//                                         service.price
//                                       }
//                                     </strong>

//                                   </div>

//                                   <div className="service-result-bottom">

//                                     <div className="service-rating">

//                                       {service.totalReviews >
//                                       0 ? (
//                                         <>
//                                           {renderStars(
//                                             service.averageRating
//                                           )}

//                                           <strong>
//                                             {
//                                               service.averageRating
//                                             }
//                                           </strong>

//                                           <span>
//                                             (
//                                             {
//                                               service.totalReviews
//                                             }{" "}
//                                             review
//                                             {service.totalReviews !==
//                                             1
//                                               ? "s"
//                                               : ""}
//                                             )
//                                           </span>
//                                         </>
//                                       ) : (
//                                         <div className="service-no-rating">

//                                           <Star
//                                             size={
//                                               15
//                                             }
//                                           />

//                                           <span>
//                                             No
//                                             reviews
//                                             yet
//                                           </span>

//                                         </div>
//                                       )}

//                                     </div>

//                                     <span className="service-duration">
//                                       {
//                                         service.duration
//                                       }{" "}
//                                       min
//                                     </span>

//                                   </div>

//                                 </div>
//                               )
//                             )}

//                           </div>
//                         )}

//                       {/* BOOK BUTTON */}

//                       <button
//                         className="primary book-business-button"
//                         type="button"
//                         onClick={() =>
//                           navigate(
//                             `/book/${business.businessSlug}`
//                           )
//                         }
//                       >
//                         <CalendarDays
//                           size={18}
//                         />

//                         Book Now
//                       </button>

//                     </div>
//                   )
//                 )}

//               </div>
//             )}

//         </section>

//       </main>

//     </div>
//   );
// }

// export default CustomerDashboard;



import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CustomerDashboard.css";

import {
  Search,
  MapPin,
  Store,
  Phone,
  CalendarDays,
  X,
  Star,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

function CustomerDashboard() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  const [businesses, setBusinesses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    {
      value: "all",
      label: "All Categories",
    },
    {
      value: "salon",
      label: "Salon",
    },
    {
      value: "barber",
      label: "Barber",
    },
    {
      value: "tutor",
      label: "Tutor",
    },
    {
      value: "gym",
      label: "Gym",
    },
    {
      value: "hospital",
      label: "Hospital",
    },
    {
      value: "repair shop",
      label: "Repair Shop",
    },
    {
      value: "other",
      label: "Other",
    },
  ];

  // ======================================================
  // SEARCH BUSINESSES
  // ======================================================

  const searchBusinesses = async () => {
    try {
      setLoading(true);
      setError("");
      setSearched(true);

      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (category !== "all") {
        params.append("category", category);
      }

      const response = await fetch(
        `${API}/business/search?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to search businesses"
        );
      }

      setBusinesses(data.businesses || []);
    } catch (error) {
      console.log(error);

      setError(
        error.message || "Something went wrong"
      );

      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // CLEAR ALL
  // ======================================================

  const clearSearch = () => {
    setSearch("");
    setCategory("all");
    setSortBy("rating");
    setBusinesses([]);
    setSearched(false);
    setError("");
  };

  // ======================================================
  // REMOVE SEARCH TEXT
  // ======================================================

  const clearSearchText = () => {
    setSearch("");
  };

  // ======================================================
  // REMOVE CATEGORY
  // ======================================================

  const clearCategory = () => {
    setCategory("all");
  };

  // ======================================================
  // CATEGORY NAME
  // ======================================================

  const getCategoryName = (type) => {
    const category = categories.find(
      (item) => item.value === type
    );

    return category
      ? category.label
      : "Other";
  };

  // ======================================================
  // SORT BUSINESSES
  // ======================================================

  const getSortedBusinesses = () => {
    const sorted = [...businesses];

    if (sortBy === "rating") {
      return sorted.sort(
        (a, b) =>
          (b.averageRating || 0) -
          (a.averageRating || 0)
      );
    }

    if (sortBy === "price-low") {
      return sorted.sort((a, b) => {
        const priceA =
          a.services?.length > 0
            ? Math.min(
                ...a.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        const priceB =
          b.services?.length > 0
            ? Math.min(
                ...b.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        return priceA - priceB;
      });
    }

    if (sortBy === "price-high") {
      return sorted.sort((a, b) => {
        const priceA =
          a.services?.length > 0
            ? Math.min(
                ...a.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        const priceB =
          b.services?.length > 0
            ? Math.min(
                ...b.services.map(
                  (service) => service.price || 0
                )
              )
            : 0;

        return priceB - priceA;
      });
    }

    if (sortBy === "name") {
      return sorted.sort((a, b) =>
        (a.businessName || "").localeCompare(
          b.businessName || ""
        )
      );
    }

    return sorted;
  };

  // ======================================================
  // RENDER STARS
  // ======================================================

  const renderStars = (rating) => {
    return (
      <div className="service-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={15}
            fill={
              star <= Math.round(rating)
                ? "currentColor"
                : "none"
            }
          />
        ))}
      </div>
    );
  };

  const sortedBusinesses = getSortedBusinesses();

  const selectedCategoryName =
    getCategoryName(category);

  return (
    <div className="customer-page">

      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <header className="customer-header">
        <div className="customer-brand">

          <div className="customer-brand-icon">
            <Store size={22} />
          </div>

          <div>
            <h1>BookEasy</h1>

            <span>
              Find & Book Local Services
            </span>
          </div>

        </div>
      </header>

      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}

      <main className="customer-main">

        <section className="customer-hero">

          <p className="eyebrow">
            FIND LOCAL BUSINESSES
          </p>

          <h2>
            Find a business near you
          </h2>

          <p className="customer-subtitle">
            Search businesses by name, location,
            or service and compare ratings before
            booking.
          </p>

          {/* ========================= */}
          {/* SEARCH BOX */}
          {/* ========================= */}

          <div className="customer-search-box">

            {/* SEARCH INPUT */}

            <div className="search-field customer-main-search">

              <Search size={20} />

              <input
                type="text"
                placeholder="Search business, location or service..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchBusinesses();
                  }
                }}
              />

              {search && (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={clearSearchText}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}

            </div>

            {/* CATEGORY */}

            <div className="search-field category-select-field">

              <Store size={20} />

              <select
                className="category-select"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
              >
                {categories.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>

            </div>

            {/* SEARCH BUTTON */}

            <button
              className="primary customer-search-button"
              type="button"
              onClick={searchBusinesses}
              disabled={loading}
            >
              <Search size={18} />

              {loading
                ? "Searching..."
                : "Search"}
            </button>

          </div>

          {/* ========================= */}
          {/* ACTIVE FILTERS */}
          {/* ========================= */}

          {(search.trim() ||
            category !== "all") && (
            <div className="active-filters">

              <div className="active-filter-label">
                <SlidersHorizontal size={15} />
                Active filters
              </div>

              {search.trim() && (
                <button
                  type="button"
                  className="filter-chip"
                  onClick={clearSearchText}
                >
                  <Search size={13} />

                  <span>
                    {search.trim()}
                  </span>

                  <X size={14} />
                </button>
              )}

              {category !== "all" && (
                <button
                  type="button"
                  className="filter-chip"
                  onClick={clearCategory}
                >
                  <Store size={13} />

                  <span>
                    {selectedCategoryName}
                  </span>

                  <X size={14} />
                </button>
              )}

              <button
                type="button"
                className="clear-filters-button"
                onClick={clearSearch}
              >
                Clear all
              </button>

            </div>
          )}

        </section>

        {/* ========================= */}
        {/* ERROR */}
        {/* ========================= */}

        {error && (
          <div className="error customer-error">
            {error}
          </div>
        )}

        {/* ========================= */}
        {/* RESULTS */}
        {/* ========================= */}

        <section className="customer-results">

          <div className="customer-results-header">

            <div>

              <p className="eyebrow">
                BUSINESSES
              </p>

              <h2>
                {searched
                  ? `${businesses.length} businesses found`
                  : "Explore businesses"}
              </h2>

            </div>

            {searched &&
              businesses.length > 0 && (
                <div className="result-controls">

                  <div className="sort-label">
                    <ArrowUpDown size={16} />
                    <span>Sort by</span>
                  </div>

                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value)
                    }
                  >
                    <option value="rating">
                      Top Rated
                    </option>

                    <option value="name">
                      Name
                    </option>

                    <option value="price-low">
                      Price: Low to High
                    </option>

                    <option value="price-high">
                      Price: High to Low
                    </option>
                  </select>

                </div>
              )}

            {searched && (
              <button
                className="outline"
                type="button"
                onClick={clearSearch}
              >
                <X size={17} />
                Clear
              </button>
            )}

          </div>

          {/* ========================= */}
          {/* LOADING */}
          {/* ========================= */}

          {loading && (
            <div className="customer-empty">

              <div className="loading-icon">
                <Search size={32} />
              </div>

              <h3>
                Finding businesses...
              </h3>

              <p>
                Please wait while we search
                for available services.
              </p>

            </div>
          )}

          {/* ========================= */}
          {/* NO RESULTS */}
          {/* ========================= */}

          {!loading &&
            searched &&
            businesses.length === 0 && (
              <div className="customer-empty">

                <div className="empty-icon">
                  <Store size={40} />
                </div>

                <h3>
                  No businesses found
                </h3>

                <p>
                  We couldn't find a business
                  matching your search.
                </p>

                <div className="empty-suggestions">
                  <span>
                    Try:
                  </span>

                  <span>
                    • A different location
                  </span>

                  <span>
                    • Another category
                  </span>

                  <span>
                    • A service name
                  </span>
                </div>

                <button
                  className="outline empty-clear-button"
                  type="button"
                  onClick={clearSearch}
                >
                  <X size={17} />
                  Clear filters
                </button>

              </div>
            )}

          {/* ========================= */}
          {/* INITIAL STATE */}
          {/* ========================= */}

          {!loading &&
            !searched && (
              <div className="customer-empty">

                <div className="empty-icon">
                  <Search size={40} />
                </div>

                <h3>
                  Search for a business
                </h3>

                <p>
                  Search by business name,
                  location, or service and
                  choose a category.
                </p>

                <div className="quick-search-hints">

                  <span>
                    <MapPin size={14} />
                    Location
                  </span>

                  <span>
                    <Store size={14} />
                    Business
                  </span>

                  <span>
                    <Search size={14} />
                    Service
                  </span>

                </div>

              </div>
            )}

          {/* ========================= */}
          {/* BUSINESS CARDS */}
          {/* ========================= */}

          {!loading &&
            sortedBusinesses.length > 0 && (
              <div className="business-results-grid">

                {sortedBusinesses.map(
                  (business) => (
                    <div
                      className="business-result-card"
                      key={business._id}
                    >

                      {/* BUSINESS TOP */}

                      <div className="business-card-top">

                        <div className="business-icon">
                          <Store size={25} />
                        </div>

                        <span className="business-category">
                          {getCategoryName(
                            business.businessType
                          )}
                        </span>

                      </div>

                      {/* BUSINESS NAME */}

                      <h3>
                        {business.businessName}
                      </h3>

                      {/* BUSINESS OVERALL RATING */}

                      <div className="business-overall-rating">

                        {business.totalReviews > 0 ? (
                          <>
                            <div className="business-rating-stars">

                              {[1, 2, 3, 4, 5].map(
                                (star) => (
                                  <Star
                                    key={star}
                                    size={17}
                                    fill={
                                      star <=
                                      Math.round(
                                        business.averageRating
                                      )
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />
                                )
                              )}

                            </div>

                            <strong>
                              {business.averageRating}
                            </strong>

                            <span>
                              {business.totalReviews}{" "}
                              review
                              {business.totalReviews !==
                              1
                                ? "s"
                                : ""}
                            </span>
                          </>
                        ) : (
                          <div className="business-no-rating">

                            <Star size={17} />

                            <span>
                              No reviews yet
                            </span>

                          </div>
                        )}

                      </div>

                      {/* BUSINESS INFO */}

                      <div className="business-info">

                        {business.address && (
                          <div>

                            <MapPin size={17} />

                            <span>
                              {business.address}
                            </span>

                          </div>
                        )}

                        {business.phone && (
                          <div>

                            <Phone size={17} />

                            <span>
                              {business.phone}
                            </span>

                          </div>
                        )}

                      </div>

                      {/* ========================= */}
                      {/* SERVICES */}
                      {/* ========================= */}

                      {business.services &&
                        business.services.length > 0 && (
                          <div className="business-services">

                            <div className="services-title">
                              Services
                            </div>

                            {business.services.map(
                              (service) => (
                                <div
                                  className="service-result-card"
                                  key={service._id}
                                >

                                  <div className="service-result-main">

                                    <div>

                                      <h4>
                                        {service.name}
                                      </h4>

                                      {service.description && (
                                        <p>
                                          {
                                            service.description
                                          }
                                        </p>
                                      )}

                                    </div>

                                    <strong className="service-price">
                                      ₹{service.price}
                                    </strong>

                                  </div>

                                  <div className="service-result-bottom">

                                    <div className="service-rating">

                                      {service.totalReviews >
                                      0 ? (
                                        <>
                                          {renderStars(
                                            service.averageRating
                                          )}

                                          <strong>
                                            {
                                              service.averageRating
                                            }
                                          </strong>

                                          <span>
                                            (
                                            {
                                              service.totalReviews
                                            }{" "}
                                            review
                                            {service.totalReviews !==
                                            1
                                              ? "s"
                                              : ""}
                                            )
                                          </span>
                                        </>
                                      ) : (
                                        <div className="service-no-rating">

                                          <Star size={15} />

                                          <span>
                                            No reviews yet
                                          </span>

                                        </div>
                                      )}

                                    </div>

                                    <span className="service-duration">
                                      {service.duration} min
                                    </span>

                                  </div>

                                </div>
                              )
                            )}

                          </div>
                        )}

                      {/* BOOK BUTTON */}

                      <button
                        className="primary book-business-button"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/book/${business.businessSlug}`
                          )
                        }
                      >
                        <CalendarDays size={18} />
                        Book Now
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

        </section>

      </main>

    </div>
  );
}

export default CustomerDashboard;