"use client";

import React, { useState, useEffect } from "react";
import { IonIcon } from '@ionic/react';
import { personOutline, chatbubbleOutline } from 'ionicons/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
    const pathname = usePathname();
    const Menus = [
        { name: "Профиль", icon: personOutline, dis: "left-1/4", href: "/user-profile" },
        { name: "Настройки чата", icon: chatbubbleOutline, dis: "left-3/4", href: "/user-chat" },
    ];

    const [active, setActive] = useState<number | null>(null);

    useEffect(() => {

        if (pathname === "/user-profile") {
            setActive(0);
        } else if (pathname === "/user-chat") {
            setActive(1);
        } else {
            setActive(null);
        }
    }, [pathname]);

    return (
        <div className="bg-[#4581E9] fixed bottom-0 left-0 right-0 max-h-[6rem] px-12 w-full font-custom z-50 border-t-8 border-white">
            <ul className="flex justify-between relative w-full">
                {active !== null && (
                    <span
                        className={`bg-rose-600 duration-500 ${active === 0 ? 'left-1/4' : 'left-3/4'} border-4 border-white h-16 w-16 absolute -top-5 rounded-full transform -translate-x-1/2`}
                    >
                        <span
                            className="w-3.5 h-3.5 bg-transparent absolute top-4 -left-[18px] 
              rounded-tr-[11px] shadow-myShadow1"
                        ></span>
                        <span
                            className="w-3.5 h-3.5 bg-transparent absolute top-4 -right-[18px] 
              rounded-tl-[11px] shadow-myShadow2"
                        ></span>
                    </span>
                )}
                {Menus.map((menu, i) => (
                    <li key={i} className="w-1/2 text-center">
                        <Link href={menu.href} onClick={() => setActive(i)}>
                            <div className="flex flex-col items-center pt-6 cursor-pointer">
                                <span
                                    className={`text-xl font-bold text-white cursor-pointer duration-500 ${i === active && "-mt-6 text-white"
                                        }`}
                                >
                                    <IonIcon icon={menu.icon} />
                                </span>
                                <span
                                    className={`text-white font-bold ${active === i
                                        ? "translate-y-4 duration-700 opacity-100"
                                        : "opacity-0 translate-y-10"
                                        } `}
                                >
                                    {menu.name}
                                </span>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Navigation;
