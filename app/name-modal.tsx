'use client';

import React, {useEffect, useState} from 'react';
import usePlayer from "@/app/use-player";

const NameModal = () => {
  const [openModal, setModal] = useState(false);
  const { player, setPlayer } = usePlayer();
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  const handleSubmit = (e: any) => {
    const player: string = e.target.playerName.value;
    setPlayer(player)
    localStorage.setItem("player", player)
    e.preventDefault()
  }

  useEffect(() => {
    if (player !== undefined) {
      setModal(false)
      localStorage.setItem("player", player)
    } else {
      const lsPlayer = localStorage.getItem("player");
      if (lsPlayer !== null) {
        setPlayer(lsPlayer)
        setModal(false)
      } else {
        setModal(true)
      }
    }
  }, [player])

  return (
    <div>{openModal &&
      <div className='fixed top-0 left-0 w-full h-full bg-gray-900 flex justify-center items-center'>
            <div className='w-96 bg-gray-300 shadow-lg rounded-md p-2'>
              <form onSubmit={handleSubmit}>
                {/*<div className='text-xl gap-2 font-medium text-gray-900 border-gray-300 m-2' for='playerName'>*/}
                <div className='text-xl gap-2 font-medium text-gray-900 border-gray-300 m-2'>
                  Enter your name:
                </div>
                <input name="playerName" className='h-10 w-full text-gray-900 p-2 rounded-md'/>
                <div className='border-t border-gray-300 flex justify-end items-end pt-2'>
                    <button
                        type='submit'
                        className='h-8 px-2 text-md rounded-md bg-gray-700 text-white'
                    >
                        Save
                    </button>
                </div>
              </form>
            </div>
        </div>}
    </div>
  );
};

export default NameModal;
