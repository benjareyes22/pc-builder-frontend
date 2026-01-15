import { createClient } from '@supabase/supabase-js';

// Tu URL real (la que acabas de encontrar)
const supabaseUrl = 'https://wswxzzqjpwvtceqfjqow.supabase.co';

// Tu llave real (la que me diste antes)
const supabaseKey = 'sb_publishable_y4JVk_W0V5llWr8PU6BA4Q_gZpFRcMj';

export const supabase = createClient(supabaseUrl, supabaseKey);