import { useEffect, useState } from "react";

const useProducts = () => {

  const [products, setProducts] = useState([]);

  useEffect(() => {

    const fetchProducts = async () => {

      try {

        const res = await fetch("http://localhost:5162/api/products");

        const data = await res.json(); 

        console.log("Products data:", data);

        setProducts(data);

      } catch (error) {

        console.error("Error loading products:", error);

      }

    };

    fetchProducts();

  }, []);

  return { products };

};

export default useProducts;
