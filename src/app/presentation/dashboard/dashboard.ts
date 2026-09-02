import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideTruck, LucideUsers, LucideWrench, LucideTrendingUp, LucideUser } from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideTruck,
    LucideUsers,
    LucideWrench,
    LucideTrendingUp,
],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {}
