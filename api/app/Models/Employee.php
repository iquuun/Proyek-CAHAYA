<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = ['name', 'position', 'phone', 'is_active', 'base_salary'];

    public function salaries()
    {
        return $this->hasMany(EmployeeSalary::class);
    }
}
