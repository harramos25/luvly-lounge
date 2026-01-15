"use client";
// Age Verification Enabled

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trash2 } from "lucide-react";

import { deleteAccount } from "@/actions/delete-account";

export default function SettingsPage() {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Are you SURE you want to delete your account? This is irreversible.")) return;
        if (!confirm("Last chance. All your data will be wiped.")) return;

        setDeleting(true);
        const res = await deleteAccount();

        if (res?.error) {
            alert("Error deleting account: " + res.error);
            setDeleting(false);
        } else {
            alert("Account deleted. Goodbye.");
            window.location.href = "/"; // Force full reload/redirect
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex justify-center">
            <div className="max-w-xl w-full">

                <h1 className="text-3xl font-serif text-[#FF6B91] mb-8">Settings</h1>

                {/* ACCOUNT ACTIONS */}
                <div className="space-y-6">
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-2">Account Management</h3>
                        <p className="text-zinc-500 text-sm mb-6">Manage your account data and privacy.</p>

                        <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4 flex items-center justify-between">
                            <div><p className="font-bold text-white text-sm">Delete Account</p><p className="text-xs text-zinc-500 mt-1">This cannot be undone.</p></div>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                {deleting ? 'Deleting...' : <><Trash2 size={14} /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
