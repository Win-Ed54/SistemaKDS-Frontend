import { useEffect, useRef } from "react";
import useOrderStore from "../store/orderStore";

const useOrderSound = () => {

  const playSound = () => {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.play();
  };

  return { playSound };
};

export default useOrderSound;

