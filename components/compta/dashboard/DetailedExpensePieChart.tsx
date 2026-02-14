"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DetailedExpenseData {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number;
}

interface DetailedExpensePieChartProps {
    data: DetailedExpenseData[];
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        payload: DetailedExpenseData;
    }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl relative z-[100]">
                <p className="text-slate-400 text-[10px] font-bold mb-1 uppercase tracking-wider">{item.name}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
                    <span className="text-white font-bold text-sm">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(item.value / 100)}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export function DetailedExpensePieChart({ data }: DetailedExpensePieChartProps) {
    const total = data.reduce((acc, item) => acc + item.value, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
        }).format(amount / 100);
    };

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                Aucune donnée à afficher
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            {/* Chart Area - Fixed height relative to container */}
            <div className="absolute top-0 left-0 right-0 bottom-[48px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            animationDuration={1000}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</span>
                </div>
            </div>

            {/* Custom Legend - Fixed Height at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[48px] flex items-center justify-center px-4">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    {data.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center gap-1.5">
                            <div
                                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/10"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                {entry.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
